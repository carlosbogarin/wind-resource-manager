from __future__ import annotations

import json
import logging
import math
import random
import ssl
import threading
import time
import urllib.error
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


_merra2_download_lock = threading.Lock()


def fetch_nasa_power_merra2_chunk(
    lat: float,
    lon: float,
    start_str: str,
    end_str: str,
    max_retries: int = 4,
) -> dict[str, Any]:
    """Busca parâmetros horários de reanálise MERRA-2 via NASA POWER API com retry e backoff."""
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

    for attempt in range(max_retries):
        try:
            with urllib.request.urlopen(req, context=ctx, timeout=90) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                return data.get("properties", {}).get("parameter", {})
        except urllib.error.HTTPError as e:
            if e.code == 429:
                wait_sec = (2 ** (attempt + 1)) + random.uniform(1.0, 3.0)
                logger.warning(
                    f"NASA POWER Rate Limit 429 ao buscar {start_str} a {end_str}. "
                    f"Aguardando {wait_sec:.1f}s antes de tentar novamente..."
                )
                time.sleep(wait_sec)
                continue
            elif attempt < max_retries - 1:
                time.sleep(2.0 * (attempt + 1))
                continue
            raise
        except Exception as ex:
            if attempt < max_retries - 1:
                time.sleep(2.0)
                continue
            raise ex

    raise RuntimeError(f"Falha ao obter dados MERRA-2 para o intervalo {start_str} a {end_str} após {max_retries} tentativas.")


def fetch_and_cache_merra2(
    node_id: str,
    lat: float,
    lon: float,
    start_year: int = 1996,
    end_year: int = 2026,
    force: bool = False,
) -> Path:
    """Baixa e processa série histórica do MERRA-2 via NASA POWER, extrapolando vento para 100m."""
    cache_path = get_merra2_cache_path(node_id, lat, lon, start_year, end_year)

    if cache_path.exists() and not force:
        logger.info(f"Série MERRA-2 já em cache: {cache_path}")
        return cache_path

    with _merra2_download_lock:
        if cache_path.exists() and not force:
            return cache_path

        logger.info(
            f"Iniciando download da série temporal MERRA-2 ({start_year}-{end_year}) para o nó {node_id} ({lat}, {lon})..."
        )

        today_fmt = datetime.now().strftime("%Y%m%d")
        earliest_nasa_hourly = "20010101"

        # NASA POWER aceita intervalos de até 5 anos por requisição horária (dados disponíveis a partir de 2001)
        chunk_size_years = 5
        all_dfs: list[pl.DataFrame] = []

        for curr_start in range(start_year, end_year + 1, chunk_size_years):
            curr_end = min(curr_start + chunk_size_years - 1, end_year)
            candidate_start = f"{curr_start}0101"
            candidate_end = f"{curr_end}1231"
            end_fmt = min(candidate_end, today_fmt)
            start_fmt = max(candidate_start, earliest_nasa_hourly)

            if end_fmt < earliest_nasa_hourly:
                logger.info(f"NASA POWER Hourly não possui registros horários antes de 2001 ({candidate_start} a {candidate_end}). Pulando...")
                continue

            if start_fmt > today_fmt or start_fmt > end_fmt:
                break

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

            n_rows = len(timestamps)
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
                    "node_id": [node_id] * n_rows,
                    "model": ["MERRA-2"] * n_rows,
                    "latitude": [lat] * n_rows,
                    "longitude": [lon] * n_rows,
                }
            )
            all_dfs.append(chunk_df)
            time.sleep(1.0)

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
    auto_fetch: bool = False,
) -> pl.DataFrame | None:
    """Carrega série temporal do MERRA-2 a partir do cache Parquet. Não efetua download automático a menos que solicitado."""
    cache_path = get_merra2_cache_path(node_id, lat, lon, start_year, end_year)
    if not cache_path.exists():
        if auto_fetch:
            fetch_and_cache_merra2(node_id, lat, lon, start_year, end_year)
        else:
            return None
    return pl.read_parquet(cache_path)

