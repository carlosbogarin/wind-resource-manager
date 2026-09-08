from __future__ import annotations

import logging
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from typing import Any, Literal

import numpy as np
import polars as pl

from src.core.config import settings
from src.core.grid_math import get_era5_bounding_nodes, get_merra2_bounding_nodes
from src.database.reanalysis_catalog import upsert_node_record
from src.etl.era5_client import fetch_and_cache_era5, load_era5_series
from src.etl.merra2_client import fetch_and_cache_merra2, load_merra2_series

logger = logging.getLogger("analytics.spatial_interpolation")


def get_vortex_cache_path(
    model: str,
    lat: float,
    lon: float,
    start_year: int = 1996,
    end_year: int = 2026,
) -> Path:
    """Gera o caminho padronizado para a série temporal sintetizada via interpolação Vortex."""
    settings.REANALYSIS_DIR.mkdir(parents=True, exist_ok=True)
    filename = f"vortex_{model.lower()}_{lat:.4f}_{lon:.4f}_{start_year}_{end_year}.parquet"
    return settings.REANALYSIS_DIR / filename


def find_existing_vortex_file(model: str, lat: float, lon: float) -> Path | None:
    """Localiza qualquer arquivo Parquet existente de série sintetizada para as coordenadas."""
    settings.REANALYSIS_DIR.mkdir(parents=True, exist_ok=True)
    pattern = f"vortex_{model.lower()}_{lat:.4f}_{lon:.4f}_*.parquet"
    matches = sorted(
        settings.REANALYSIS_DIR.glob(pattern),
        key=lambda p: p.stat().st_mtime,
        reverse=True,
    )
    return matches[0] if matches else None


def load_vortex_series(
    model: str,
    lat: float,
    lon: float,
    start_year: int = 1996,
    end_year: int = 2026,
) -> pl.DataFrame | None:
    """Carrega série temporal sintetizada a partir do cache Parquet."""
    cache_path = get_vortex_cache_path(model, lat, lon, start_year, end_year)
    if cache_path.exists():
        return pl.read_parquet(cache_path)

    existing = find_existing_vortex_file(model, lat, lon)
    if existing and existing.exists():
        return pl.read_parquet(existing)

    return None


def interpolate_reanalysis_to_point(
    model: Literal["ERA5", "MERRA-2"],
    lat: float,
    lon: float,
    site_name: str = "Ponto Alvo",
    start_year: int = 1996,
    end_year: int = 2026,
    force: bool = False,
) -> dict[str, Any]:
    """Executa a interpolação espacial vetorial horizontal dos 4 nós da grade até as coordenadas do ponto alvo.

    Fundamentação Metodológica (Shepard, 1968 / WMO No. 8):
    1. Decomposição horária da velocidade e direção em componentes ortogonais (u: zonal, v: meridional);
    2. Ponderação pelo Inverso da Distância Ponderada Geodésica (IDW com expoente p=2);
    3. Interpolação espacial independente das componentes u e v;
    4. Reconstituição física da velocidade resultante e da direção angular do vento;
    5. Interpolação ponderada das grandezas escalares (vento 10m, temperatura e pressão).
    """
    cache_path = get_vortex_cache_path(model, lat, lon, start_year, end_year)
    if cache_path.exists() and not force:
        logger.info(f"Série sintetizada {model} encontrada em cache para ({lat:.4f}, {lon:.4f}).")
        df = pl.read_parquet(cache_path)
        file_mb = round(cache_path.stat().st_size / (1024 * 1024), 2)
        nodes = get_era5_bounding_nodes(lat, lon) if model == "ERA5" else get_merra2_bounding_nodes(lat, lon)
        return {
            "status": "success",
            "model": model,
            "synthetic_node_id": f"VORTEX-{model}",
            "site_name": site_name,
            "latitude": lat,
            "longitude": lon,
            "records_count": len(df),
            "file_path": str(cache_path),
            "file_size_mb": file_mb,
            "cached": True,
            "weights": {n.position: n.weight for n in nodes},
            "bounding_nodes": [
                {
                    "node_id": getattr(n, "node_id", f"{model}-{n.position}"),
                    "position": n.position,
                    "latitude": n.latitude,
                    "longitude": n.longitude,
                    "distance_km": n.distance_km,
                    "bearing_deg": n.bearing_deg,
                    "weight": n.weight,
                }
                for n in nodes
            ],
            "message": f"Série sintetizada {model} carregada do cache ({len(df)} horas, {file_mb} MB).",
        }

    # 1. Obter os 4 nós circundantes da grade
    if model == "ERA5":
        nodes = get_era5_bounding_nodes(lat, lon)
    else:
        nodes = get_merra2_bounding_nodes(lat, lon)

    node_dfs: dict[str, pl.DataFrame] = {}
    weights: dict[str, float] = {n.position: n.weight for n in nodes}

    def _fetch_node_data(n) -> tuple[str, pl.DataFrame]:
        node_id = f"{model}-{n.position}"
        if model == "ERA5":
            df = load_era5_series(node_id, n.latitude, n.longitude, start_year, end_year)
            if df is None or len(df) == 0:
                logger.info(f"Baixando nó faltante {node_id} ({n.latitude:.4f}, {n.longitude:.4f}) para interpolação espacial...")
                fetch_and_cache_era5(node_id, n.latitude, n.longitude, start_year, end_year)
                df = load_era5_series(node_id, n.latitude, n.longitude, start_year, end_year)
        else:
            df = load_merra2_series(node_id, n.latitude, n.longitude, start_year, end_year)
            if df is None or len(df) == 0:
                logger.info(f"Baixando nó faltante {node_id} ({n.latitude:.4f}, {n.longitude:.4f}) para interpolação espacial...")
                fetch_and_cache_merra2(node_id, n.latitude, n.longitude, start_year, end_year)
                df = load_merra2_series(node_id, n.latitude, n.longitude, start_year, end_year)

        if df is None or len(df) == 0:
            raise RuntimeError(f"Não foi possível obter dados para o nó {node_id} ({n.latitude}, {n.longitude}).")

        return n.position, df

    # Download e carregamento concorrente em paralelo dos 4 nós (reduz o tempo em até 4x)
    with ThreadPoolExecutor(max_workers=min(4, len(nodes))) as executor:
        results = list(executor.map(_fetch_node_data, nodes))

    for pos, df in results:
        node_dfs[pos] = df

    # Normalizar soma de pesos
    total_w = sum(weights.values())
    if total_w > 0:
        weights = {pos: w / total_w for pos, w in weights.items()}

    # 2. Emparelhamento por timestamp
    base_pos = "NW" if "NW" in node_dfs else list(node_dfs.keys())[0]
    aligned_df = node_dfs[base_pos].select("timestamp").sort("timestamp")

    for pos in ["NW", "NE", "SW", "SE"]:
        if pos in node_dfs:
            cur_df = node_dfs[pos].select(
                [
                    pl.col("timestamp"),
                    pl.col("wind_speed_100m").alias(f"ws100_{pos}"),
                    pl.col("wind_direction_100m").alias(f"wd100_{pos}"),
                    pl.col("wind_speed_10m").alias(f"ws10_{pos}"),
                    pl.col("wind_direction_10m").alias(f"wd10_{pos}"),
                    pl.col("temperature_2m_c").alias(f"t2m_{pos}"),
                    pl.col("surface_pressure_hpa").alias(f"ps_{pos}"),
                ]
            )
            aligned_df = aligned_df.join(cur_df, on="timestamp", how="inner")

    aligned_df = aligned_df.sort("timestamp")
    n_hours = len(aligned_df)
    if n_hours == 0:
        raise RuntimeError("Não foi possível alinhar timestamps coincidentes entre os 4 nós.")

    # 3. Decomposição vetorial horária (u: zonal, v: meridional)
    u_100_syn = np.zeros(n_hours, dtype=np.float64)
    v_100_syn = np.zeros(n_hours, dtype=np.float64)
    u_10_syn = np.zeros(n_hours, dtype=np.float64)
    v_10_syn = np.zeros(n_hours, dtype=np.float64)
    t2m_syn = np.zeros(n_hours, dtype=np.float64)
    ps_syn = np.zeros(n_hours, dtype=np.float64)

    rad_factor = np.pi / 180.0

    for pos in ["NW", "NE", "SW", "SE"]:
        w = weights.get(pos, 0.25)
        ws100 = aligned_df[f"ws100_{pos}"].to_numpy().astype(np.float64)
        wd100 = aligned_df[f"wd100_{pos}"].to_numpy().astype(np.float64)
        ws10 = aligned_df[f"ws10_{pos}"].to_numpy().astype(np.float64)
        wd10 = aligned_df[f"wd10_{pos}"].to_numpy().astype(np.float64)
        t2m = aligned_df[f"t2m_{pos}"].to_numpy().astype(np.float64)
        ps = aligned_df[f"ps_{pos}"].to_numpy().astype(np.float64)

        # Decomposição na convenção meteorológica (vento soprando DE onde vem)
        # u = -S * sin(theta); v = -S * cos(theta)
        u100_i = -ws100 * np.sin(wd100 * rad_factor)
        v100_i = -ws100 * np.cos(wd100 * rad_factor)
        u10_i = -ws10 * np.sin(wd10 * rad_factor)
        v10_i = -ws10 * np.cos(wd10 * rad_factor)

        u_100_syn += w * u100_i
        v_100_syn += w * v100_i
        u_10_syn += w * u10_i
        v_10_syn += w * v10_i
        t2m_syn += w * t2m
        ps_syn += w * ps

    # 4. Reconstituição física da magnitude e direção no ponto alvo
    final_ws100 = np.round(np.sqrt(u_100_syn**2 + v_100_syn**2), 2)
    final_wd100 = np.round((np.degrees(np.arctan2(-u_100_syn, -v_100_syn)) + 360.0) % 360.0, 1)

    final_ws10 = np.round(np.sqrt(u_10_syn**2 + v_10_syn**2), 2)
    final_wd10 = np.round((np.degrees(np.arctan2(-u_10_syn, -v_10_syn)) + 360.0) % 360.0, 1)

    final_t2m = np.round(t2m_syn, 1)
    final_ps = np.round(ps_syn, 1)

    node_id_val = f"VORTEX-{model}"
    final_df = pl.DataFrame(
        {
            "timestamp": aligned_df["timestamp"],
            "wind_speed_100m": final_ws100,
            "wind_speed_10m": final_ws10,
            "wind_direction_100m": final_wd100,
            "wind_direction_10m": final_wd10,
            "surface_pressure_hpa": final_ps,
            "temperature_2m_c": final_t2m,
            "node_id": [node_id_val] * n_hours,
            "model": [model] * n_hours,
            "latitude": [lat] * n_hours,
            "longitude": [lon] * n_hours,
        }
    )

    final_df.write_parquet(cache_path)
    file_mb = round(cache_path.stat().st_size / (1024 * 1024), 2)
    min_ts = final_df["timestamp"].min()
    max_ts = final_df["timestamp"].max()

    # 5. Persistência no Catálogo DuckDB
    upsert_node_record(
        model=f"{model}_VORTEX",
        node_id=node_id_val,
        lat=lat,
        lon=lon,
        min_timestamp=min_ts,
        max_timestamp=max_ts,
        total_records=n_hours,
        file_path=cache_path,
        file_size_mb=file_mb,
    )

    logger.info(
        f"Série sintetizada Vortex {model} salva com sucesso para {site_name} ({n_hours} horas, {file_mb} MB)."
    )

    return {
        "status": "success",
        "model": model,
        "synthetic_node_id": node_id_val,
        "site_name": site_name,
        "latitude": lat,
        "longitude": lon,
        "records_count": n_hours,
        "file_path": str(cache_path),
        "file_size_mb": file_mb,
        "cached": False,
        "weights": {pos: round(w, 4) for pos, w in weights.items()},
        "bounding_nodes": [
            {
                "node_id": getattr(n, "node_id", f"{model}-{n.position}"),
                "position": n.position,
                "latitude": n.latitude,
                "longitude": n.longitude,
                "distance_km": n.distance_km,
                "bearing_deg": n.bearing_deg,
                "weight": n.weight,
            }
            for n in nodes
        ],
        "message": f"Extrapolação horizontal ({model}) sintetizada com sucesso para {site_name}: {n_hours} horas processadas.",
    }
