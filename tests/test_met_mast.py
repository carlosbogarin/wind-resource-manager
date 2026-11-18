from __future__ import annotations

import uuid
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from src.api.main import app
from src.core.config import settings


@pytest.fixture(autouse=True)
def isolated_met_mast_dirs(tmp_path: Path, monkeypatch: pytest.MonkeyPatch):
    """Isola diretórios de upload e sessão do módulo Torres Anemométricas durante os testes."""
    met_dir = tmp_path / "met_mast"
    upload_dir = met_dir / "uploads"
    sessions_dir = met_dir / "sessions"
    upload_dir.mkdir(parents=True, exist_ok=True)
    sessions_dir.mkdir(parents=True, exist_ok=True)

    monkeypatch.setattr(settings, "MET_MAST_DIR", met_dir)
    monkeypatch.setattr(settings, "MET_MAST_UPLOAD_DIR", upload_dir)
    monkeypatch.setattr(settings, "MET_MAST_SESSIONS_DIR", sessions_dir)


def test_met_mast_full_workflow():
    """Valida listagem, carregamento, QC, análises e exportação do módulo Torres Anemométricas."""
    client = TestClient(app)
    session_id = f"test_{uuid.uuid4().hex[:8]}"
    headers = {"X-MetMast-Session": session_id}

    # 1. Listar datasets disponíveis sem menções comerciais
    r_list = client.get("/api/met-mast/datasets", headers=headers)
    assert r_list.status_code == 200
    datasets = r_list.json()
    assert len(datasets) >= 3
    ids = {d["id"] for d in datasets}
    assert {"demo_data", "demo_campbell_scientific", "demo_tabular_mast"}.issubset(ids)
    for d in datasets:
        assert "windographer" not in d["name"].lower()
        assert "windographer" not in d["description"].lower()

    # 2. Carregar demo_data
    r_load = client.post(
        "/api/met-mast/datasets/load",
        json={"dataset_id": "demo_data", "session_id": session_id},
        headers=headers,
    )
    assert r_load.status_code == 200
    meta = r_load.json()
    assert meta["dataset_id"] == "demo_data"
    assert meta["total_rows"] > 10000
    assert meta["qc_applied"] is False

    speed_cols = [c for c in meta["columns"] if c["role"] == "speed"]
    dir_cols = [c for c in meta["columns"] if c["role"] == "direction"]
    std_cols = [c for c in meta["columns"] if c["role"] == "speed_std"]
    assert len(speed_cols) >= 3
    assert len(dir_cols) >= 1
    assert len(std_cols) >= 1

    primary_spd = speed_cols[0]["name"]
    primary_dir = dir_cols[0]["name"]
    matching_std = f"{primary_spd}Std" if any(c["name"] == f"{primary_spd}Std" for c in std_cols) else std_cols[0]["name"]

    # 3. Série temporal
    r_ts = client.get(
        "/api/met-mast/timeseries",
        params={"columns": primary_spd, "max_points": 300, "session_id": session_id},
        headers=headers,
    )
    assert r_ts.status_code == 200
    ts = r_ts.json()
    assert len(ts["timestamps"]) <= 350
    assert primary_spd in ts["series"]

    # 4. Aplicar Controle de Qualidade (inclusive sombra cruzando Norte 350 -> 20 graus)
    r_qc = client.post(
        "/api/met-mast/qc/apply",
        json={
            "speed_col": primary_spd,
            "min_speed": 0.5,
            "max_speed": 35.0,
            "direction_col": primary_dir,
            "shadow_sector_start": 350.0,
            "shadow_sector_end": 20.0,
            "session_id": session_id,
        },
        headers=headers,
    )
    assert r_qc.status_code == 200
    qc = r_qc.json()
    assert qc["total_points"] == meta["total_rows"]
    assert qc["valid_points"] <= qc["total_points"]
    assert "mast_shadow_sector" in qc["flagged_by_rule"]

    # 5. Rosa dos Ventos
    r_rose = client.get(
        "/api/met-mast/analysis/wind-rose",
        params={"speed_col": primary_spd, "direction_col": primary_dir, "sectors": 16, "session_id": session_id},
        headers=headers,
    )
    assert r_rose.status_code == 200
    rose = r_rose.json()
    assert len(rose["sector_data"]) == 16
    assert rose["total_records"] > 0

    # 6. Cisalhamento Vertical (Shear)
    anemometers = [{"column": c["name"], "height": c["height"]} for c in speed_cols if c["height"] is not None]
    r_shear = client.post(
        "/api/met-mast/analysis/wind-shear",
        json={
            "anemometers": anemometers,
            "hub_heights": [100.0, 120.0, 140.0],
            "min_speed": 3.0,
            "apply_qc": True,
            "session_id": session_id,
        },
        headers=headers,
    )
    assert r_shear.status_code == 200
    shear = r_shear.json()
    assert 0.0 <= shear["alpha"] <= 1.0
    assert len(shear["extrapolated_hub_heights"]) == 3

    # 7. Turbulência IEC 61400-1
    r_ti = client.get(
        "/api/met-mast/analysis/turbulence",
        params={"speed_col": primary_spd, "std_col": matching_std, "session_id": session_id},
        headers=headers,
    )
    assert r_ti.status_code == 200
    ti = r_ti.json()
    assert len(ti["speed_bins"]) > 0
    assert "iec_class_a" in ti["speed_bins"][0]

    # 8. Matriz 12x24
    r_12x24 = client.get(
        "/api/met-mast/analysis/12x24",
        params={"speed_col": primary_spd, "session_id": session_id},
        headers=headers,
    )
    assert r_12x24.status_code == 200
    m12 = r_12x24.json()
    assert len(m12["months"]) == 12
    assert len(m12["hours"]) == 24
    assert len(m12["matrix"]) == 12
    assert len(m12["matrix"][0]) == 24

    # 9. Distribuição de Weibull
    r_weibull = client.get(
        "/api/met-mast/analysis/weibull",
        params={"speed_col": primary_spd, "session_id": session_id},
        headers=headers,
    )
    assert r_weibull.status_code == 200
    wb = r_weibull.json()
    assert wb["k_shape"] > 0
    assert wb["c_scale"] > 0
    assert len(wb["histogram"]) > 0

    # 10. Exportação WAsP .tab e CSV limpo
    r_tab = client.post(
        "/api/met-mast/export/wasp-tab",
        json={
            "speed_col": primary_spd,
            "direction_col": primary_dir,
            "height": 80.0,
            "lat": -5.1,
            "lon": -37.5,
            "mast_name": "TorreTeste",
            "session_id": session_id,
        },
        headers=headers,
    )
    assert r_tab.status_code == 200
    assert len(r_tab.text) > 50

    r_csv = client.get(
        "/api/met-mast/export/clean-csv",
        params={"apply_qc": True, "session_id": session_id},
        headers=headers,
    )
    assert r_csv.status_code == 200
    assert "text/csv" in r_csv.headers["content-type"]

    # 11. Reset de QC
    r_reset = client.post(
        "/api/met-mast/qc/reset",
        params={"session_id": session_id},
        headers=headers,
    )
    assert r_reset.status_code == 200
    assert r_reset.json()["flagged_points"] == 0


def test_met_mast_upload_validation_and_session_isolation():
    """Valida upload seguro de CSV e isolamento independente entre sessões."""
    client = TestClient(app)

    # Rejeitar extensão inválida
    r_bad = client.post(
        "/api/met-mast/datasets/upload",
        files={"file": ("malware.exe", b"MZ...", "application/octet-stream")},
    )
    assert r_bad.status_code == 400

    # Upload CSV válido
    csv_body = "\n".join(
        [
            "Timestamp,Spd80mN,Dir78mS",
            *[f"2025-01-01 {h:02d}:00:00,{6.0 + (h % 5) * 0.5:.1f},{(h * 15) % 360}" for h in range(24)],
        ]
    ).encode("utf-8")

    sid_a = f"sessA_{uuid.uuid4().hex[:6]}"
    sid_b = f"sessB_{uuid.uuid4().hex[:6]}"
    unique_name = f"mast_{uuid.uuid4().hex[:6]}.csv"

    r_up = client.post(
        "/api/met-mast/datasets/upload",
        files={"file": (f"../../{unique_name}", csv_body, "text/csv")},
    )
    assert r_up.status_code == 200
    ds_id = r_up.json()["dataset_id"]
    assert ".." not in ds_id

    # Sessão A carrega upload e Sessão B carrega demo_data
    r_a = client.post("/api/met-mast/datasets/load", json={"dataset_id": ds_id, "session_id": sid_a})
    r_b = client.post("/api/met-mast/datasets/load", json={"dataset_id": "demo_data", "session_id": sid_b})
    assert r_a.status_code == 200
    assert r_b.status_code == 200
    assert r_a.json()["total_rows"] == 24
    assert r_b.json()["total_rows"] > 10000
