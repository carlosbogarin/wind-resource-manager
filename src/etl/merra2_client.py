from __future__ import annotations

import json
import logging
import math
import ssl
import urllib.request
from datetime import datetime
from pathlib import Path
from typing import Any

import polars as pl

from src.core.config import settings

logger = logging.getLogger("merra2_client")


def _get_ssl_context() -> ssl.SSLContext:
    """Cria contexto SSL resiliente para requisições externas."""
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    return ctx


def get_merra2_cache_path(node_id: str, lat: float, lon: float, start_year: int, end_year: int) -> Path:
    """Gera caminho de arquivo padronizado para cache em Parquet do MERRA-2."""
    settings.REANALYSIS_DIR.mkdir(parents=True, exist_ok=True)
    clean_id = node_id.replace(" ", "_").replace("-", "_")
    filename = f"merra2_{clean_id}_{lat:.4f}_{lon:.4f}_{start_year}_{end_year}.parquet"
    return settings.REANALYSIS_DIR / filename


def fetch_nasa_power_merra2_chunk(
    lat: float,
    lon: float,
    start_str: str,
    end_str: str,
) -> dict[str, Any]:
    """Busca parâmetros horários de reanálise MERRA-2 via NASA POWER API.

    start_str e end_str no formato YYYYMMDD.
    """
    url = (
        f"{settings.NASA_POWER_HOURLY_URL}?"
        f"parameters=WS10M,WS50M,WD10M,WD50M,T2M,PS&"
        f"community=RE&longitude={lon:.4f}&latitude={lat:.4f}&"
        f"start={start_str}&end={end_str}&format=JSON"
    )

    req = urllib.request.Request(
        url,
        headers={"User-Agent": "WindResourceManager/1.0 (NASA POWER MERRA-2 Harvester)"},
    )
    ctx = _get_ssl_context()

    with urllib.request.urlopen(req, context=ctx, timeout=90) as resp:
        data = json.loads(resp.read().decode("utf-8"))

    return data.get("properties", {}).get("parameter", {})


def fetch_and_cache_merra2(
    node_id: str,
    lat: float,
    lon: float,
    start_year: int = 1994,
    end_year: int = 2024,
    force: bool = False,
) -> Path:
    """Baixa e processa série histórica do MERRA-2 via NASA POWER, extrapolando vento para 100m."""
    cache_path = get_merra2_cache_path(node_id, lat, lon, start_year, end_year)

    if cache_path.exists() and not force:
        logger.info(f"Série MERRA-2 já em cache: {cache_path}")
        return cache_path

    logger.info(
        f"Iniciando download da série temporal MERRA-2 ({start_year}-{end_year}) para o nó {node_id} ({lat}, {lon})..."
    )

    # NASA POWER aceita intervalos de até 5 anos por requisição horária
    chunk_size_years = 5
    all_dfs: list[pl.DataFrame] = []

    for curr_start in range(start_year, end_year + 1, chunk_size_years):
        curr_end = min(curr_start + chunk_size_years - 1, end_year)
        start_fmt = f"{curr_start}0101"
        end_fmt = f"{curr_end}1231"

        logger.info(f"Baixando bloco MERRA-2 {start_fmt} a {end_fmt}...")
        params = fetch_nasa_power_merra2_chunk(lat, lon, start_fmt, end_fmt)

        ws50_dict = params.get("WS50M", {})
        ws10_dict = params.get("WS10M", {})
        wd50_dict = params.get("WD50M", {})
        wd10_dict = params.get("WD10M", {})
        ps_dict = params.get("PS", {})
        t2m_dict = params.get("T2M", {})

        if not ws50_dict:
            continue

        timestamps: list[datetime] = []
        ws50_list: list[float] = []
        ws10_list: list[float] = []
        ws100_list: list[float] = []
        wd50_list: list[float] = []
        wd10_list: list[float] = []
        ps_list: list[float] = []
        t2m_list: list[float] = []

        for key, v50 in ws50_dict.items():
            # Formato da chave da NASA: 'YYYYMMDDHH' (ex: '2023010100')
            try:
                dt = datetime.strptime(key, "%Y%m%d%H")
            except Exception:
                continue

            v10 = ws10_dict.get(key, -999.0)
            d50 = wd50_dict.get(key, -999.0)
            d10 = wd10_dict.get(key, -999.0)
            press = ps_dict.get(key, -999.0)
            temp = t2m_dict.get(key, -999.0)

            # Filtro de valores faltantes da NASA (-999.0)
            if v50 < 0:
                v50 = 0.0
            if v10 < 0:
                v10 = v50 * 0.75

            # Extrapolação do cisalhamento do vento para 100m via lei potencial:
            # alpha = ln(v50/v10) / ln(50/10)
            if v50 > 0.1 and v10 > 0.1:
                alpha = max(0.05, min(0.40, math.log(v50 / v10) / math.log(50.0 / 10.0)))
            else:
                alpha = 0.143  # Coeficiente padrão de Hellmann

            v100 = v50 * ((100.0 / 50.0) ** alpha)

            timestamps.append(dt)
            ws50_list.append(round(v50, 2))
            ws10_list.append(round(v10, 2))
            ws100_list.append(round(v100, 2))
            wd50_list.append(round(d50 if d50 >= 0 else 0.0, 1))
            wd10_list.append(round(d10 if d10 >= 0 else 0.0, 1))
            ps_list.append(round(press * 10.0 if press > 0 else 1013.25, 1))  # kPa para hPa
            t2m_list.append(round(temp, 1) if temp > -100 else 25.0)

        chunk_df = pl.DataFrame(
            {
                "timestamp": timestamps,
                "wind_speed_100m": ws100_list,
                "wind_speed_50m": ws50_list,
                "wind_speed_10m": ws10_list,
                "wind_direction_50m": wd50_list,
                "wind_direction_10m": wd10_list,
                "surface_pressure_hpa": ps_list,
                "temperature_2m_c": t2m_list,
                "node_id": pl.lit(node_id),
                "model": pl.lit("MERRA-2"),
                "latitude": pl.lit(lat),
                "longitude": pl.lit(lon),
            }
        )
        all_dfs.append(chunk_df)

    if not all_dfs:
        raise ValueError(f"Nenhum dado MERRA-2 retornado para o nó {node_id} ({lat}, {lon})")

    final_df = pl.concat(all_dfs).sort("timestamp")
    final_df.write_parquet(cache_path)
    logger.info(
        f"Série MERRA-2 salva em {cache_path} ({len(final_df)} registros, {cache_path.stat().st_size / 1024 / 1024:.2f} MB)"
    )
    return cache_path


def load_merra2_series(
    node_id: str,
    lat: float,
    lon: float,
    start_year: int = 1994,
    end_year: int = 2024,
) -> pl.DataFrame:
    """Carrega série temporal do MERRA-2 a partir do cache Parquet, baixando caso não exista."""
    cache_path = get_merra2_cache_path(node_id, lat, lon, start_year, end_year)
    if not cache_path.exists():
        fetch_and_cache_merra2(node_id, lat, lon, start_year, end_year)
    return pl.read_parquet(cache_path)
