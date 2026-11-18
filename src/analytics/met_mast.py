from __future__ import annotations

import json
import logging
import math
import os
import re
import tempfile
import threading
from collections import OrderedDict
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

import matplotlib

# Configura backend sem interface gráfica antes de importar o BrightWind
matplotlib.use("Agg")

import brightwind as bw  # noqa: E402
import numpy as np  # noqa: E402
import pandas as pd  # noqa: E402
from scipy import stats  # noqa: E402

from src.core.config import settings  # noqa: E402

logger = logging.getLogger("analytics.met_mast")

ALLOWED_UPLOAD_EXTENSIONS = {".csv", ".txt", ".dat", ".tim"}
MAX_UPLOAD_SIZE_BYTES = 50 * 1024 * 1024  # 50 MB
MAX_CACHED_SESSIONS = 16


def _safe_float(value: Any, digits: int = 2) -> float | None:
    """Converte valor numérico para float finito arredondado, retornando None para NaN/Inf."""
    if value is None or pd.isna(value):
        return None
    try:
        num = float(value)
    except (TypeError, ValueError):
        return None
    if not math.isfinite(num):
        return None
    return round(num, digits)


def sanitize_session_id(raw_session: str | None) -> str:
    """Normaliza o identificador de sessão para uso seguro em nomes de diretório."""
    if not raw_session or not raw_session.strip():
        return "default"
    cleaned = re.sub(r"[^a-zA-Z0-9_-]", "_", raw_session.strip())
    return cleaned[:64] or "default"


def sanitize_filename(raw_name: str) -> str:
    """Extrai o nome-base seguro de arquivo, evitando path traversal."""
    base = Path(raw_name).name
    cleaned = re.sub(r"[^a-zA-Z0-9._-]", "_", base)
    return cleaned or "uploaded_mast.csv"


@dataclass
class _MetMastSessionState:
    """Estado isolado de uma sessão de análise de torre anemométrica."""

    session_id: str
    dataset_id: str
    df: pd.DataFrame
    flags_mask: pd.Series
    qc_rules: dict[str, Any] | None = None
    qc_summary: dict[str, Any] | None = None
    lock: threading.RLock = field(default_factory=threading.RLock)


class MetMastService:
    """Serviço modular para ingestão, QC, análises anemométricas e exportação WAsP de torres/LiDAR.

    Implementa isolamento por sessão (com persistência leve em disco) para compatibilidade
    simultânea em ambiente local Windows, Docker e Google Cloud Run.
    """

    def __init__(self) -> None:
        self._sessions: OrderedDict[str, _MetMastSessionState] = OrderedDict()
        self._registry_lock = threading.RLock()
        settings.MET_MAST_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
        settings.MET_MAST_SESSIONS_DIR.mkdir(parents=True, exist_ok=True)

    def _session_file(self, session_id: str) -> Path:
        safe_id = sanitize_session_id(session_id)
        session_dir = settings.MET_MAST_SESSIONS_DIR / safe_id
        session_dir.mkdir(parents=True, exist_ok=True)
        return session_dir / "session.json"

    def _save_session_metadata(self, state: _MetMastSessionState) -> None:
        """Persiste o identificador do dataset ativo e regras de QC no disco da sessão."""
        try:
            payload = {
                "dataset_id": state.dataset_id,
                "qc_rules": state.qc_rules,
                "qc_summary": state.qc_summary,
            }
            self._session_file(state.session_id).write_text(
                json.dumps(payload, ensure_ascii=False),
                encoding="utf-8",
            )
        except Exception as exc:
            logger.warning(f"Não foi possível salvar metadados da sessão {state.session_id}: {exc}")

    def _load_session_metadata(self, session_id: str) -> dict[str, Any] | None:
        """Recupera metadados persistidos da sessão, se existirem."""
        meta_path = self._session_file(session_id)
        if not meta_path.exists():
            return None
        try:
            return json.loads(meta_path.read_text(encoding="utf-8"))
        except Exception as exc:
            logger.warning(f"Falha ao ler metadados da sessão {session_id}: {exc}")
            return None

    def list_datasets(self) -> list[dict[str, Any]]:
        """Lista os conjuntos de demonstração integrados e os arquivos enviados pelo usuário."""
        datasets: list[dict[str, Any]] = [
            {
                "id": "demo_data",
                "name": "Torre Anemométrica Padrão (80m / 60m / 40m)",
                "description": (
                    "Campanha multi-altura com anemômetros em 80m, 60m e 40m, palhetas em 78m, 58m e 38m, "
                    "desvios padrão de turbulência, temperatura, umidade relativa e pressão."
                ),
                "type": "builtin",
                "filename": "demo_data.csv",
            },
            {
                "id": "demo_campbell_scientific",
                "name": "Logger Campbell Scientific CR1000",
                "description": "Formato bruto típico de datalogger de campo com cabeçalho meteorológico estendido.",
                "type": "builtin",
                "filename": "demo_campbell_scientific.csv",
            },
            {
                "id": "demo_tabular_mast",
                "name": "Torre Anemométrica — Formato Tabular Padrão (.txt)",
                "description": "Série temporal tabular multi-canal em arquivo texto delimitado (.txt).",
                "type": "builtin",
                "filename": "demo_tabular_mast.txt",
            },
        ]

        upload_dir = settings.MET_MAST_UPLOAD_DIR
        if upload_dir.exists():
            for path in sorted(upload_dir.iterdir(), key=lambda p: p.name.lower()):
                if path.is_file() and path.suffix.lower() in ALLOWED_UPLOAD_EXTENSIONS:
                    size_kb = round(path.stat().st_size / 1024.0, 1)
                    datasets.append(
                        {
                            "id": f"upload_{path.name}",
                            "name": path.name,
                            "description": f"Arquivo de torre enviado ({size_kb} KB)",
                            "type": "uploaded",
                            "filename": path.name,
                        }
                    )
        return datasets

    def save_uploaded_file(self, filename: str, contents: bytes) -> dict[str, Any]:
        """Valida extensão/tamanho e armazena de forma segura o arquivo enviado."""
        safe_name = sanitize_filename(filename)
        suffix = Path(safe_name).suffix.lower()
        if suffix not in ALLOWED_UPLOAD_EXTENSIONS:
            raise ValueError(
                "Formato não suportado. Envie arquivos .csv, .txt, .dat ou .tim."
            )
        if len(contents) == 0:
            raise ValueError("O arquivo enviado está vazio.")
        if len(contents) > MAX_UPLOAD_SIZE_BYTES:
            raise ValueError("Arquivo excede o limite máximo permitido de 50 MB.")

        dest_path = (settings.MET_MAST_UPLOAD_DIR / safe_name).resolve()
        if dest_path.parent != settings.MET_MAST_UPLOAD_DIR.resolve():
            raise ValueError("Caminho de destino inválido.")

        dest_path.write_bytes(contents)
        return {
            "status": "success",
            "dataset_id": f"upload_{safe_name}",
            "filename": safe_name,
            "size_bytes": len(contents),
        }

    def detect_column_role(self, col_name: str) -> dict[str, Any]:
        """Infere papel físico do sensor, orientação do boom e altura de medição (m)."""
        name_lower = col_name.lower()
        role = "other"
        unit = ""
        height: float | None = None
        orientation = ""

        # Extrair altura em metros (ex: 80m, 120.5m, _100m)
        height_match = re.search(r"(\d+(?:\.\d+)?)\s*m", col_name, re.IGNORECASE)
        if height_match:
            try:
                height = float(height_match.group(1))
            except ValueError:
                height = None

        # Extrair orientação cardeal do braço/boom (N, S, E, W, NE, NW, SE, SW)
        orient_match = re.search(r"([NSEW]{1,2})(?:$|Std|Max|Min|_)", col_name)
        if orient_match:
            orientation = orient_match.group(1)

        if any(x in name_lower for x in ["std", "sd", "desv"]):
            role = "speed_std"
            unit = "m/s"
        elif any(x in name_lower for x in ["max", "gust", "raj"]):
            role = "speed_max"
            unit = "m/s"
        elif any(x in name_lower for x in ["min"]):
            role = "speed_min"
            unit = "m/s"
        elif any(x in name_lower for x in ["spd", "ws", "speed", "anem", "velo"]):
            role = "speed"
            unit = "m/s"
        elif any(x in name_lower for x in ["dir", "wd", "vane", "dire"]):
            role = "direction"
            unit = "°"
        elif any(x in name_lower for x in ["temp", "t2m", "t_"]):
            role = "temperature"
            unit = "°C"
        elif any(x in name_lower for x in ["rh", "humid", "umid", "ur"]):
            role = "humidity"
            unit = "%"
        elif any(x in name_lower for x in ["press", "p2m", "baro", "pa", "hpa"]):
            role = "pressure"
            unit = "hPa"
        elif any(x in name_lower for x in ["batt", "volt", "v_"]):
            role = "battery"
            unit = "V"

        return {
            "name": col_name,
            "role": role,
            "height": height,
            "orientation": orientation,
            "unit": unit,
        }

    def _read_raw_dataframe(self, dataset_id: str) -> pd.DataFrame:
        """Carrega o DataFrame bruto a partir de dataset integrado ou arquivo enviado."""
        if dataset_id == "demo_data":
            df = bw.load_csv(bw.demo_datasets.demo_data)
        elif dataset_id == "demo_campbell_scientific":
            df = bw.load_campbell_scientific(bw.demo_datasets.demo_campbell_scientific_data)
        elif dataset_id in {"demo_tabular_mast", "demo_windographer_data"}:
            df = bw.load_windographer_txt(bw.demo_datasets.demo_windographer_data)
        elif dataset_id.startswith("upload_"):
            raw_filename = dataset_id.replace("upload_", "", 1)
            safe_name = sanitize_filename(raw_filename)
            file_path = (settings.MET_MAST_UPLOAD_DIR / safe_name).resolve()
            if file_path.parent != settings.MET_MAST_UPLOAD_DIR.resolve() or not file_path.exists():
                raise FileNotFoundError(f"Arquivo '{safe_name}' não encontrado no servidor.")

            df = None
            for loader in (
                lambda p: bw.load_csv(str(p)),
                lambda p: bw.load_campbell_scientific(str(p)),
                lambda p: bw.load_windographer_txt(str(p)),
                lambda p: pd.read_csv(str(p), parse_dates=[0], index_col=0),
                lambda p: pd.read_csv(str(p), sep=None, engine="python", parse_dates=[0], index_col=0),
            ):
                try:
                    candidate = loader(file_path)
                    if candidate is not None and len(candidate) > 0:
                        df = candidate
                        break
                except Exception:
                    continue

            if df is None:
                raise ValueError(
                    f"Não foi possível interpretar o arquivo '{safe_name}'. Verifique o separador e a coluna de data/hora."
                )
        else:
            raise ValueError(f"Identificador de dataset desconhecido: '{dataset_id}'.")

        if not isinstance(df.index, pd.DatetimeIndex):
            df.index = pd.to_datetime(df.index, errors="coerce")
            df = df[df.index.notna()]

        df = df.sort_index()
        return df

    def load_dataset(self, dataset_id: str, session_id: str = "default") -> dict[str, Any]:
        """Carrega o dataset na sessão especificada e calcula estatísticas iniciais dos sensores."""
        safe_session = sanitize_session_id(session_id)
        canonical_id = "demo_tabular_mast" if dataset_id == "demo_windographer_data" else dataset_id
        df = self._read_raw_dataframe(canonical_id)

        state = _MetMastSessionState(
            session_id=safe_session,
            dataset_id=canonical_id,
            df=df,
            flags_mask=pd.Series(True, index=df.index),
            qc_rules=None,
            qc_summary=None,
        )

        with self._registry_lock:
            self._sessions[safe_session] = state
            self._sessions.move_to_end(safe_session)
            while len(self._sessions) > MAX_CACHED_SESSIONS:
                self._sessions.popitem(last=False)

        self._save_session_metadata(state)
        return self._build_loaded_metadata(state)

    def _build_loaded_metadata(self, state: _MetMastSessionState) -> dict[str, Any]:
        """Constrói o dicionário resumido de colunas, cobertura e estatísticas do dataset."""
        df = state.df
        columns_info = [self.detect_column_role(str(col)) for col in df.columns]

        stats_map: dict[str, dict[str, Any]] = {}
        total_count = len(df)
        for col in df.columns:
            series = pd.to_numeric(df[col], errors="coerce")
            valid_count = int(series.dropna().count())
            coverage_pct = round((valid_count / total_count) * 100.0, 2) if total_count > 0 else 0.0
            stats_map[str(col)] = {
                "coverage_pct": coverage_pct,
                "mean": _safe_float(series.mean(), 2) if valid_count > 0 else None,
                "min": _safe_float(series.min(), 2) if valid_count > 0 else None,
                "max": _safe_float(series.max(), 2) if valid_count > 0 else None,
                "std": _safe_float(series.std(), 2) if valid_count > 0 else None,
            }

        interval_minutes = 10
        if len(df.index) > 1:
            diffs = df.index.to_series().diff().dropna().dt.total_seconds()
            if len(diffs) > 0:
                median_sec = float(diffs.median())
                if math.isfinite(median_sec) and median_sec > 0:
                    interval_minutes = max(1, round(median_sec / 60.0))

        return {
            "dataset_id": state.dataset_id,
            "session_id": state.session_id,
            "total_rows": total_count,
            "start_time": str(df.index.min()) if total_count > 0 else "",
            "end_time": str(df.index.max()) if total_count > 0 else "",
            "sampling_interval_min": interval_minutes,
            "columns": columns_info,
            "stats": stats_map,
            "qc_applied": state.qc_rules is not None,
            "qc_summary": state.qc_summary,
        }

    def _get_session_state(
        self,
        session_id: str = "default",
        dataset_id: str | None = None,
    ) -> _MetMastSessionState:
        """Obtém o estado ativo da sessão ou restaura automaticamente do disco caso necessário."""
        safe_session = sanitize_session_id(session_id)
        canonical_req_id = (
            "demo_tabular_mast" if dataset_id == "demo_windographer_data" else dataset_id
        )

        with self._registry_lock:
            state = self._sessions.get(safe_session)
            if state is not None:
                self._sessions.move_to_end(safe_session)
                if not canonical_req_id or state.dataset_id == canonical_req_id:
                    return state

        # Tentar restaurar metadados persistidos ou dataset explícito
        persisted = self._load_session_metadata(safe_session)
        target_dataset_id = canonical_req_id or (persisted.get("dataset_id") if persisted else None)

        if not target_dataset_id:
            raise ValueError("Nenhum dataset carregado nesta sessão. Carregue uma torre para continuar.")

        self.load_dataset(target_dataset_id, session_id=safe_session)

        # Se havia regras de QC gravadas para esse mesmo dataset nesta sessão, reaplica automaticamente
        if persisted and persisted.get("dataset_id") == target_dataset_id and persisted.get("qc_rules"):
            saved_rules = dict(persisted["qc_rules"])
            saved_rules["session_id"] = safe_session
            self.apply_qc_rules(**saved_rules)

        with self._registry_lock:
            return self._sessions[safe_session]

    def get_timeseries(
        self,
        columns: list[str],
        max_points: int = 1500,
        start_date: str | None = None,
        end_date: str | None = None,
        session_id: str = "default",
        dataset_id: str | None = None,
    ) -> dict[str, Any]:
        """Retorna séries temporais reamostradas para plotagem interativa fluida."""
        state = self._get_session_state(session_id=session_id, dataset_id=dataset_id)
        with state.lock:
            df = state.df
            if start_date:
                df = df[df.index >= pd.to_datetime(start_date)]
            if end_date:
                df = df[df.index <= pd.to_datetime(end_date)]

            if len(df) == 0:
                return {
                    "timestamps": [],
                    "series": {},
                    "valid_mask": [],
                    "total_raw_points": 0,
                    "sampled_points": 0,
                    "downsample_factor": 1,
                    "qc_applied": state.qc_rules is not None,
                }

            step = max(1, len(df) // max_points)
            sampled_df = df.iloc[::step]
            sampled_mask = state.flags_mask.loc[sampled_df.index]

            timestamps = [ts.strftime("%Y-%m-%d %H:%M") for ts in sampled_df.index]
            series_data: dict[str, list[float | None]] = {}
            for col in columns:
                if col in sampled_df.columns:
                    numeric_col = pd.to_numeric(sampled_df[col], errors="coerce")
                    series_data[col] = [_safe_float(v, 2) for v in numeric_col]

            return {
                "timestamps": timestamps,
                "series": series_data,
                "valid_mask": [bool(v) for v in sampled_mask],
                "total_raw_points": len(df),
                "sampled_points": len(sampled_df),
                "downsample_factor": step,
                "qc_applied": state.qc_rules is not None,
            }

    def apply_qc_rules(
        self,
        speed_col: str,
        min_speed: float = 0.0,
        max_speed: float = 45.0,
        direction_col: str | None = None,
        shadow_sector_start: float | None = None,
        shadow_sector_end: float | None = None,
        temp_col: str | None = None,
        min_temp_icing: float | None = None,
        std_col: str | None = None,
        min_std_frozen: float | None = None,
        session_id: str = "default",
        dataset_id: str | None = None,
    ) -> dict[str, Any]:
        """Aplica regras físicas, de sombra de torre e congelamento e atualiza a máscara de validade."""
        state = self._get_session_state(session_id=session_id, dataset_id=dataset_id)
        with state.lock:
            df = state.df
            if speed_col not in df.columns:
                raise ValueError(f"Canal de velocidade '{speed_col}' não encontrado no dataset.")

            mask = pd.Series(True, index=df.index)
            rule_counts: dict[str, int] = {}

            # 1. Limites físicos de velocidade (mínimo / máximo / ausente)
            speed_series = pd.to_numeric(df[speed_col], errors="coerce")
            speed_invalid = (speed_series < min_speed) | (speed_series > max_speed) | speed_series.isna()
            rule_counts["speed_out_of_bounds"] = int(speed_invalid.sum())
            mask = mask & (~speed_invalid)

            # 2. Setor de sombra de torre (Mast Shadow), tratando travessia por 0° (Norte)
            if (
                direction_col
                and direction_col in df.columns
                and shadow_sector_start is not None
                and shadow_sector_end is not None
            ):
                dir_series = pd.to_numeric(df[direction_col], errors="coerce")
                start_deg = float(shadow_sector_start) % 360.0
                end_deg = float(shadow_sector_end) % 360.0
                if start_deg <= end_deg:
                    shadow = (dir_series >= start_deg) & (dir_series <= end_deg)
                else:
                    shadow = (dir_series >= start_deg) | (dir_series <= end_deg)
                rule_counts["mast_shadow_sector"] = int(shadow.fillna(False).sum())
                mask = mask & (~shadow.fillna(False))

            # 3. Detecção de gelo / travamento mecânico do anemômetro
            if (
                temp_col
                and temp_col in df.columns
                and min_temp_icing is not None
                and std_col
                and std_col in df.columns
                and min_std_frozen is not None
            ):
                temp_series = pd.to_numeric(df[temp_col], errors="coerce")
                std_series = pd.to_numeric(df[std_col], errors="coerce")
                frozen = (temp_series <= min_temp_icing) & (std_series <= min_std_frozen)
                rule_counts["icing_frozen_sensor"] = int(frozen.fillna(False).sum())
                mask = mask & (~frozen.fillna(False))

            total_points = len(df)
            total_valid = int(mask.sum())
            total_flagged = int((~mask).sum())
            summary = {
                "total_points": total_points,
                "valid_points": total_valid,
                "flagged_points": total_flagged,
                "valid_pct": round((total_valid / total_points) * 100.0, 2) if total_points > 0 else 0.0,
                "flagged_by_rule": rule_counts,
            }

            state.flags_mask = mask
            state.qc_rules = {
                "speed_col": speed_col,
                "min_speed": min_speed,
                "max_speed": max_speed,
                "direction_col": direction_col,
                "shadow_sector_start": shadow_sector_start,
                "shadow_sector_end": shadow_sector_end,
                "temp_col": temp_col,
                "min_temp_icing": min_temp_icing,
                "std_col": std_col,
                "min_std_frozen": min_std_frozen,
            }
            state.qc_summary = summary
            self._save_session_metadata(state)
            return summary

    def reset_qc_rules(self, session_id: str = "default", dataset_id: str | None = None) -> dict[str, Any]:
        """Limpa todas as flags de QC aplicadas na sessão, restaurando todos os registros como válidos."""
        state = self._get_session_state(session_id=session_id, dataset_id=dataset_id)
        with state.lock:
            state.flags_mask = pd.Series(True, index=state.df.index)
            state.qc_rules = None
            state.qc_summary = None
            self._save_session_metadata(state)
            total_points = len(state.df)
            return {
                "total_points": total_points,
                "valid_points": total_points,
                "flagged_points": 0,
                "valid_pct": 100.0 if total_points > 0 else 0.0,
                "flagged_by_rule": {},
            }

    def _filtered_df(self, state: _MetMastSessionState, apply_qc: bool) -> pd.DataFrame:
        if apply_qc and state.flags_mask is not None:
            return state.df[state.flags_mask]
        return state.df

    def calculate_wind_rose(
        self,
        speed_col: str,
        direction_col: str,
        sectors: int = 16,
        apply_qc: bool = True,
        session_id: str = "default",
        dataset_id: str | None = None,
    ) -> dict[str, Any]:
        """Calcula distribuição direcional da Rosa dos Ventos em 12 ou 16 setores."""
        state = self._get_session_state(session_id=session_id, dataset_id=dataset_id)
        with state.lock:
            df = self._filtered_df(state, apply_qc)
            if speed_col not in df.columns or direction_col not in df.columns:
                raise ValueError("Canais de velocidade ou direção não encontrados no dataset.")

            speed_series = pd.to_numeric(df[speed_col], errors="coerce").dropna()
            dir_series = pd.to_numeric(df[direction_col], errors="coerce").dropna() % 360.0
            common_idx = speed_series.index.intersection(dir_series.index)
            speed_series = speed_series.loc[common_idx]
            dir_series = dir_series.loc[common_idx]

            if len(common_idx) == 0:
                raise ValueError("Sem registros concomitantes válidos para gerar a Rosa dos Ventos.")

            sectors = sectors if sectors in (8, 12, 16) else 16
            sector_width = 360.0 / sectors
            half_width = sector_width / 2.0

            speed_bins = [0.0, 3.0, 6.0, 9.0, 12.0, 15.0, float("inf")]
            speed_bin_labels = ["0-3 m/s", "3-6 m/s", "6-9 m/s", "9-12 m/s", "12-15 m/s", ">15 m/s"]

            cardinal_16 = [
                "N", "NNE", "NE", "ENE",
                "E", "ESE", "SE", "SSE",
                "S", "SSW", "SW", "WSW",
                "W", "WNW", "NW", "NNW",
            ]
            cardinal_12 = [
                "0° (N)", "30°", "60° (ENE)", "90° (E)",
                "120° (ESE)", "150°", "180° (S)", "210°",
                "240° (WSW)", "270° (W)", "300° (WNW)", "330°",
            ]
            cardinal_8 = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"]

            if sectors == 16:
                sector_names = cardinal_16
            elif sectors == 12:
                sector_names = cardinal_12
            else:
                sector_names = cardinal_8

            sector_data = []
            total_valid_records = len(common_idx)

            for i in range(sectors):
                center_angle = i * sector_width
                start_angle = (center_angle - half_width) % 360.0
                end_angle = (center_angle + half_width) % 360.0

                if start_angle < end_angle:
                    sector_filter = (dir_series >= start_angle) & (dir_series < end_angle)
                else:
                    sector_filter = (dir_series >= start_angle) | (dir_series < end_angle)

                sector_speeds = speed_series[sector_filter]
                count = int(len(sector_speeds))
                freq_pct = round((count / total_valid_records) * 100.0, 2)
                mean_spd = _safe_float(sector_speeds.mean(), 2) if count > 0 else 0.0

                bin_pcts = []
                for b_idx in range(len(speed_bins) - 1):
                    b_min, b_max = speed_bins[b_idx], speed_bins[b_idx + 1]
                    b_count = int(((sector_speeds >= b_min) & (sector_speeds < b_max)).sum())
                    bin_pcts.append(round((b_count / total_valid_records) * 100.0, 2))

                sector_data.append(
                    {
                        "sector_index": i,
                        "label": sector_names[i],
                        "center_angle": center_angle,
                        "frequency_pct": freq_pct,
                        "mean_speed": mean_spd or 0.0,
                        "count": count,
                        "speed_bins": bin_pcts,
                    }
                )

            return {
                "sectors": sectors,
                "sector_width": sector_width,
                "total_records": total_valid_records,
                "mean_speed": _safe_float(speed_series.mean(), 2) or 0.0,
                "speed_bin_labels": speed_bin_labels,
                "sector_data": sector_data,
            }

    def calculate_wind_shear(
        self,
        anemometers: list[dict[str, Any]],
        hub_heights: list[float] | None = None,
        min_speed: float = 3.0,
        apply_qc: bool = True,
        session_id: str = "default",
        dataset_id: str | None = None,
    ) -> dict[str, Any]:
        """Calcula perfil de cisalhamento vertical (Lei de Potência α e Lei Logarítmica z₀)."""
        state = self._get_session_state(session_id=session_id, dataset_id=dataset_id)
        if hub_heights is None:
            hub_heights = [100.0, 120.0, 140.0, 160.0]

        with state.lock:
            df = self._filtered_df(state, apply_qc)
            if len(anemometers) < 2:
                raise ValueError("São necessários ao menos 2 anemômetros com alturas definidas para calcular o cisalhamento vertical.")

            sorted_pairs = sorted(
                [(str(a["column"]), float(a["height"])) for a in anemometers],
                key=lambda x: x[1],
                reverse=True,
            )
            cols = [p[0] for p in sorted_pairs]
            heights = [p[1] for p in sorted_pairs]

            if len(set(heights)) < 2:
                raise ValueError("Selecione anemômetros instalados em pelo menos 2 alturas distintas.")

            for col in cols:
                if col not in df.columns:
                    raise ValueError(f"Canal '{col}' não encontrado no dataset.")

            work_df = df[cols].apply(pd.to_numeric, errors="coerce")

            shear_power = bw.Shear.Average(work_df, heights, min_speed=min_speed, calc_method="power_law")
            alpha = _safe_float(shear_power.alpha, 4) or 0.0

            roughness: float | None = None
            try:
                shear_log = bw.Shear.Average(work_df, heights, min_speed=min_speed, calc_method="log_law")
                roughness = _safe_float(shear_log.roughness, 5)
            except Exception:
                roughness = None

            measured_points = []
            for col, h in zip(cols, heights):
                valid_spd = work_df[col][work_df[col] >= min_speed]
                spd_mean = _safe_float(valid_spd.mean(), 2) or 0.0
                measured_points.append({"height": h, "speed": spd_mean, "column": col})

            ref_h = heights[0]
            ref_spd = measured_points[0]["speed"]

            max_h = max(list(hub_heights) + heights) + 20.0
            curve_heights = list(range(10, int(max_h) + 5, 5))
            profile_curve = [
                {
                    "height": float(h),
                    "speed": round(ref_spd * ((h / ref_h) ** alpha), 2) if ref_h > 0 else 0.0,
                }
                for h in curve_heights
            ]

            extrapolated = []
            for hh in sorted(hub_heights):
                scaled_spd = round(ref_spd * ((hh / ref_h) ** alpha), 2) if ref_h > 0 else 0.0
                inc_pct = round(((scaled_spd - ref_spd) / ref_spd) * 100.0, 1) if ref_spd > 0 else 0.0
                extrapolated.append(
                    {
                        "hub_height": float(hh),
                        "power_law_speed": scaled_spd,
                        "speed_increase_pct": inc_pct,
                    }
                )

            return {
                "alpha": alpha,
                "roughness_z0": roughness,
                "reference_height": ref_h,
                "reference_speed": ref_spd,
                "measured_points": measured_points,
                "profile_curve": profile_curve,
                "extrapolated_hub_heights": extrapolated,
            }

    def calculate_turbulence(
        self,
        speed_col: str,
        std_col: str,
        min_speed: float = 3.0,
        apply_qc: bool = True,
        session_id: str = "default",
        dataset_id: str | None = None,
    ) -> dict[str, Any]:
        """Calcula Intensidade de Turbulência (TI média e característica P90) vs curvas IEC 61400-1."""
        state = self._get_session_state(session_id=session_id, dataset_id=dataset_id)
        with state.lock:
            df = self._filtered_df(state, apply_qc)
            if speed_col not in df.columns or std_col not in df.columns:
                raise ValueError("Canais de velocidade média ou desvio padrão não encontrados.")

            wspd = pd.to_numeric(df[speed_col], errors="coerce")
            wspd_std = pd.to_numeric(df[std_col], errors="coerce")

            _, ti_table = bw.TI.by_speed(wspd, wspd_std, min_speed=min_speed, return_data=True)

            speed_bins_data = []
            for bin_center, row in ti_table.iterrows():
                speed_val = float(bin_center)
                mean_ti = _safe_float(row.get("Mean_TI"), 3)
                rep_ti = _safe_float(row.get("Rep_TI"), 3)
                count_raw = row.get("TI_Count", 0)
                count = int(count_raw) if not pd.isna(count_raw) else 0

                if mean_ti is None and rep_ti is None:
                    continue

                # IEC 61400-1 Normal Turbulence Model (NTM): TI_90 = I_ref * (0.75 + 5.6 / V)
                iec_a = round(0.16 * (0.75 + 5.6 / speed_val), 3) if speed_val > 0 else 0.0
                iec_b = round(0.14 * (0.75 + 5.6 / speed_val), 3) if speed_val > 0 else 0.0
                iec_c = round(0.12 * (0.75 + 5.6 / speed_val), 3) if speed_val > 0 else 0.0

                speed_bins_data.append(
                    {
                        "speed_bin": round(speed_val, 1),
                        "mean_ti": mean_ti if mean_ti is not None else 0.0,
                        "characteristic_ti_90": rep_ti if rep_ti is not None else 0.0,
                        "count": count,
                        "iec_class_a": iec_a,
                        "iec_class_b": iec_b,
                        "iec_class_c": iec_c,
                    }
                )

            ti_at_15 = next(
                (b["characteristic_ti_90"] for b in speed_bins_data if 14.5 <= b["speed_bin"] <= 15.5),
                None,
            )

            return {
                "speed_column": speed_col,
                "std_column": std_col,
                "speed_bins": speed_bins_data,
                "char_ti_at_15ms": ti_at_15,
            }

    def calculate_12x24(
        self,
        speed_col: str,
        apply_qc: bool = True,
        session_id: str = "default",
        dataset_id: str | None = None,
    ) -> dict[str, Any]:
        """Calcula a matriz diurna-sazonal (12 meses x 24 horas)."""
        state = self._get_session_state(session_id=session_id, dataset_id=dataset_id)
        with state.lock:
            df = self._filtered_df(state, apply_qc)
            if speed_col not in df.columns:
                raise ValueError(f"Canal '{speed_col}' não encontrado no dataset.")

            series = pd.to_numeric(df[speed_col], errors="coerce").dropna()
            if len(series) == 0:
                raise ValueError("Sem registros válidos para gerar a matriz 12x24.")

            _, table_12x24 = bw.dist_12x24(series, return_data=True)

            months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"]
            hours = [f"{h:02d}:00" for h in range(24)]

            matrix: list[list[float | None]] = []
            for m_idx in range(1, 13):
                month_row: list[float | None] = []
                for h in range(24):
                    if h in table_12x24.index and m_idx in table_12x24.columns:
                        val = _safe_float(table_12x24.loc[h, m_idx], 2)
                    else:
                        val = None
                    month_row.append(val)
                matrix.append(month_row)

            return {
                "months": months,
                "hours": hours,
                "matrix": matrix,
            }

    def calculate_weibull(
        self,
        speed_col: str,
        apply_qc: bool = True,
        session_id: str = "default",
        dataset_id: str | None = None,
    ) -> dict[str, Any]:
        """Ajusta a distribuição de Weibull via Máxima Verossimilhança (MLE) com histograma."""
        state = self._get_session_state(session_id=session_id, dataset_id=dataset_id)
        with state.lock:
            df = self._filtered_df(state, apply_qc)
            if speed_col not in df.columns:
                raise ValueError(f"Canal '{speed_col}' não encontrado no dataset.")

            series = pd.to_numeric(df[speed_col], errors="coerce").dropna()
            arr = series.to_numpy(dtype=float)
            arr = arr[np.isfinite(arr) & (arr >= 0.1)]

            if len(arr) < 10:
                raise ValueError("Amostra insuficiente de ventos válidos (>= 0,1 m/s) para ajuste de Weibull.")

            mean_spd = float(np.mean(arr))
            std_spd = float(np.std(arr))

            try:
                shape_k, _, scale_c = stats.weibull_min.fit(arr, floc=0)
                k = float(shape_k)
                c = float(scale_c)
            except Exception:
                # Fallback pelo método empírico de Justus caso MLE não convirja
                if std_spd > 0 and mean_spd > 0:
                    k = (std_spd / mean_spd) ** (-1.086)
                    c = mean_spd / math.gamma(1.0 + 1.0 / k)
                else:
                    k, c = 2.0, max(mean_spd, 1.0)

            bins = np.arange(0, 26, 1)
            counts, _ = np.histogram(arr, bins=bins, density=True)

            histogram = []
            fitted_curve = []
            for i in range(len(counts)):
                spd = float((bins[i] + bins[i + 1]) / 2.0)
                pdf = (k / c) * ((spd / c) ** (k - 1.0)) * math.exp(-((spd / c) ** k)) if c > 0 else 0.0
                histogram.append(
                    {
                        "speed": spd,
                        "bin_label": f"{bins[i]}-{bins[i + 1]}",
                        "empirical_freq_pct": round(float(counts[i] * 100.0), 2),
                    }
                )
                fitted_curve.append(
                    {
                        "speed": round(spd, 1),
                        "weibull_pdf_pct": round(float(pdf * 100.0), 2),
                    }
                )

            return {
                "k_shape": round(k, 2),
                "c_scale": round(c, 2),
                "mean_speed": round(mean_spd, 2),
                "std_speed": round(std_spd, 2),
                "histogram": histogram,
                "fitted_curve": fitted_curve,
            }

    def export_wasp_tab(
        self,
        speed_col: str,
        direction_col: str,
        height: float,
        lat: float = -5.0,
        lon: float = -38.0,
        mast_name: str = "Torre_Eolica_01",
        apply_qc: bool = True,
        session_id: str = "default",
        dataset_id: str | None = None,
    ) -> str:
        """Gera string da tabela de frequências direcionais no formato padrão WAsP (.tab)."""
        state = self._get_session_state(session_id=session_id, dataset_id=dataset_id)
        with state.lock:
            df = self._filtered_df(state, apply_qc)
            if speed_col not in df.columns or direction_col not in df.columns:
                raise ValueError("Canais de velocidade ou direção não encontrados no dataset.")

            safe_mast = re.sub(r"[^a-zA-Z0-9._-]", "_", mast_name) or "MetMast"
            spd = pd.to_numeric(df[speed_col], errors="coerce")
            wdir = pd.to_numeric(df[direction_col], errors="coerce")

            _, freq_tab = bw.freq_table(spd, wdir, return_data=True)
            tab_filename = f"{safe_mast}_{int(round(height))}m.tab"

            with tempfile.TemporaryDirectory() as tmp_dir:
                bw.export_tab_file(
                    freq_tab=freq_tab,
                    height=height,
                    lat=lat,
                    long=lon,
                    file_name=tab_filename,
                    folder_path=tmp_dir,
                )
                output_path = os.path.join(tmp_dir, tab_filename)
                with open(output_path, encoding="utf-8", errors="ignore") as f:
                    return f.read()

    def export_clean_csv(
        self,
        apply_qc: bool = True,
        session_id: str = "default",
        dataset_id: str | None = None,
    ) -> tuple[str, str]:
        """Exporta a série temporal completa (filtrada ou bruta) em CSV UTF-8."""
        state = self._get_session_state(session_id=session_id, dataset_id=dataset_id)
        with state.lock:
            df = self._filtered_df(state, apply_qc)
            csv_content = df.to_csv()
            safe_id = sanitize_filename(state.dataset_id.replace("upload_", ""))
            stem = Path(safe_id).stem or "met_mast"
            suffix = "limpo_qc" if apply_qc and state.qc_rules else "completo"
            return csv_content, f"{stem}_{suffix}.csv"


met_mast_service = MetMastService()
