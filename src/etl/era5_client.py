from __future__ import annotations

import json
import logging
import ssl
import urllib.request
from pathlib import Path
from typing import Any

import polars as pl

from src.core.config import settings

logger = logging.getLogger("era5_client")


def _get_ssl_context() -> ssl.SSLContext:
    """Cria contexto SSL resiliente para downloads em qualquer ambiente."""
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    return ctx


def get_era5_cache_path(node_id: str, lat: float, lon: float, start_year: int, end_year: int) -> Path:
    """Gera caminho de arquivo padronizado para cache em Parquet do ERA5."""
    settings.REANALYSIS_DIR.mkdir(parents=True, exist_ok=True)
    clean_id = node_id.replace(" ", "_").replace("-", "_")
    filename = f"era5_{clean_id}_{lat:.4f}_{lon:.4f}_{start_year}_{end_year}.parquet"
    return settings.REANALYSIS_DIR / filename


def fetch_era5_timeseries_chunk(
    lat: float,
    lon: float,
    start_date: str,
    end_date: str,
) -> dict[str, Any]:
    """Busca um bloco de série temporal horária de reanálise ERA5 via Open-Meteo Archive API."""
    url = (
        f"{settings.OPEN_METEO_ARCHIVE_URL}?"
        f"latitude={lat:.4f}&longitude={lon:.4f}&"
        f"start_date={start_date}&end_date={end_date}&"
        f"hourly=wind_speed_100m,wind_speed_10m,wind_direction_100m,wind_direction_10m,surface_pressure,temperature_2m&"
        f"wind_speed_unit=ms"
    )

    req = urllib.request.Request(
        url,
        headers={"User-Agent": "WindResourceManager/1.0 (ECMWF ERA5 Reanalysis Harvester)"},
    )
    ctx = _get_ssl_context()

    with urllib.request.urlopen(req, context=ctx, timeout=60) as resp:
        data = json.loads(resp.read().decode("utf-8"))

    return data.get("hourly", {})


def fetch_and_cache_era5(
    node_id: str,
    lat: float,
    lon: float,
    start_year: int = 1994,
    end_year: int = 2024,
    force: bool = False,
) -> Path:
    """Baixa a série temporal histórica de reanálise ERA5 (até 30 anos) e salva em Parquet."""
    cache_path = get_era5_cache_path(node_id, lat, lon, start_year, end_year)

    if cache_path.exists() and not force:
        logger.info(f"Série ERA5 já em cache: {cache_path}")
        return cache_path

    logger.info(
        f"Iniciando download da série temporal ERA5 ({start_year}-{end_year}) para o nó {node_id} ({lat}, {lon})..."
    )

    # Dividir em blocos de até 5 anos para alta confiabilidade e resiliência de rede
    chunk_size_years = 5
    all_dfs: list[pl.DataFrame] = []

    for curr_start in range(start_year, end_year + 1, chunk_size_years):
        curr_end = min(curr_start + chunk_size_years - 1, end_year)
        start_date = f"{curr_start}-01-01"
        end_date = f"{curr_end}-12-31"

        logger.info(f"Baixando bloco ERA5 {start_date} a {end_date}...")
        hourly_data = fetch_era5_timeseries_chunk(lat, lon, start_date, end_date)

        times = hourly_data.get("time", [])
        ws100 = hourly_data.get("wind_speed_100m", [])
        ws10 = hourly_data.get("wind_speed_10m", [])
        wd100 = hourly_data.get("wind_direction_100m", [])
        wd10 = hourly_data.get("wind_direction_10m", [])
        pressure = hourly_data.get("surface_pressure", [])
        temp = hourly_data.get("temperature_2m", [])

        if not times:
            continue

        chunk_df = pl.DataFrame(
            {
                "timestamp": pl.Series(times, dtype=pl.Utf8).str.to_datetime("%Y-%m-%dT%H:%M"),
                "wind_speed_100m": pl.Series(ws100, dtype=pl.Float64),
                "wind_speed_10m": pl.Series(ws10, dtype=pl.Float64),
                "wind_direction_100m": pl.Series(wd100, dtype=pl.Float64),
                "wind_direction_10m": pl.Series(wd10, dtype=pl.Float64),
                "surface_pressure_hpa": pl.Series(pressure, dtype=pl.Float64),
                "temperature_2m_c": pl.Series(temp, dtype=pl.Float64),
                "node_id": pl.lit(node_id),
                "model": pl.lit("ERA5"),
                "latitude": pl.lit(lat),
                "longitude": pl.lit(lon),
            }
        )
        all_dfs.append(chunk_df)

    if not all_dfs:
        raise ValueError(f"Nenhum dado retornado para o nó {node_id} ({lat}, {lon})")

    final_df = pl.concat(all_dfs).sort("timestamp")
    final_df.write_parquet(cache_path)
    logger.info(
        f"Série ERA5 salva com sucesso em {cache_path} ({len(final_df)} registros horários, {cache_path.stat().st_size / 1024 / 1024:.2f} MB)"
    )
    return cache_path


def load_era5_series(
    node_id: str,
    lat: float,
    lon: float,
    start_year: int = 1994,
    end_year: int = 2024,
) -> pl.DataFrame:
    """Carrega série temporal do ERA5 a partir do cache Parquet, baixando caso não exista."""
    cache_path = get_era5_cache_path(node_id, lat, lon, start_year, end_year)
    if not cache_path.exists():
        fetch_and_cache_era5(node_id, lat, lon, start_year, end_year)
    return pl.read_parquet(cache_path)
