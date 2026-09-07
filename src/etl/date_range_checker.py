from __future__ import annotations

import json
import logging
import ssl
import time
import urllib.request
from datetime import datetime, timedelta
from typing import Any

from src.core.config import settings

logger = logging.getLogger("date_range_checker")

# Cache em memória por 6 horas para evitar chamadas de rede desnecessárias
_CACHE_EXPIRY = 6 * 3600
_cached_date_range: dict[str, Any] | None = None
_last_check_time: float = 0.0


def _get_ssl_context() -> ssl.SSLContext:
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    return ctx


def check_era5_latest_date() -> datetime:
    """Consulta a data mais recente disponível no acervo oficial ERA5 via Open-Meteo."""
    ctx = _get_ssl_context()
    now = datetime.now()
    # Testar janela recente
    start_test = (now - timedelta(days=90)).strftime("%Y-%m-%d")
    end_test = now.strftime("%Y-%m-%d")

    url = (
        f"{settings.OPEN_METEO_ARCHIVE_URL}?"
        f"latitude=-14.0&longitude=-42.0&"
        f"start_date={start_test}&end_date={end_test}&"
        f"hourly=wind_speed_100m"
    )

    req = urllib.request.Request(
        url,
        headers={"User-Agent": "WindResourceManager/1.0 (DateRange Inspector)"},
    )
    with urllib.request.urlopen(req, context=ctx, timeout=12) as resp:
        data = json.loads(resp.read().decode("utf-8"))
        times = data.get("hourly", {}).get("time", [])
        if times:
            # Ex: '2026-09-01T23:00'
            last_str = times[-1]
            return datetime.strptime(last_str[:10], "%Y-%m-%d")

    # Fallback seguro: 5 dias antes de hoje
    return now - timedelta(days=5)


def check_merra2_latest_date() -> datetime:
    """Consulta a data mais recente disponível na reanálise MERRA-2 via NASA POWER API."""
    ctx = _get_ssl_context()
    now = datetime.now()
    # MERRA-2 tem latência típica de 5 a 15 dias na NASA
    start_fmt = (now - timedelta(days=120)).strftime("%Y%m%d")
    end_fmt = now.strftime("%Y%m%d")

    url = (
        f"{settings.NASA_POWER_HOURLY_URL}?"
        f"parameters=WS10M&community=RE&longitude=-42.0&latitude=-14.0&"
        f"start={start_fmt}&end={end_fmt}&format=JSON"
    )

    req = urllib.request.Request(
        url,
        headers={"User-Agent": "WindResourceManager/1.0 (DateRange Inspector)"},
    )
    with urllib.request.urlopen(req, context=ctx, timeout=15) as resp:
        data = json.loads(resp.read().decode("utf-8"))
        ws10 = data.get("properties", {}).get("parameter", {}).get("WS10M", {})
        valid_keys = [k for k, v in ws10.items() if v != -999.0]
        if valid_keys:
            # Ex: '2026083023'
            last_key = valid_keys[-1]
            return datetime.strptime(last_key[:8], "%Y%m%d")

    # Fallback seguro: 15 dias antes de hoje
    return now - timedelta(days=15)


def get_synchronized_30y_date_range(force_refresh: bool = False) -> dict[str, Any]:
    """Calcula o emparelhamento dinâmico entre ERA5 e MERRA-2.
    
    Regra do Negócio:
    Identifica o modelo mais defasado/desatualizado (min(data_era5, data_merra2)).
    Usa essa data como referência final comum e retrocede exatamente 30 anos dali para trás.
    """
    global _cached_date_range, _last_check_time

    now_ts = time.time()
    if _cached_date_range and not force_refresh and (now_ts - _last_check_time < _CACHE_EXPIRY):
        return _cached_date_range

    try:
        era5_date = check_era5_latest_date()
    except Exception as e:
        logger.warning(f"Não foi possível consultar data ERA5 online ({e}). Usando estimativa.")
        era5_date = datetime.now() - timedelta(days=6)

    try:
        merra2_date = check_merra2_latest_date()
    except Exception as e:
        logger.warning(f"Não foi possível consultar data MERRA-2 online ({e}). Usando estimativa.")
        merra2_date = datetime.now() - timedelta(days=15)

    # Identificar o mais desatualizado (o menor valor) para emparelhar ambos
    if era5_date <= merra2_date:
        common_end = era5_date
        limiting_model = "ERA5"
    else:
        common_end = merra2_date
        limiting_model = "MERRA-2"

    # 30 anos retroativos exatos a partir da data de referência emparelhada
    try:
        common_start = common_end.replace(year=common_end.year - 30)
    except ValueError:
        # Ajuste para ano bissexto (ex: 29 de fevereiro)
        common_start = common_end.replace(year=common_end.year - 30, day=28)

    # Anos e meses formatados para seleção precisa (não apenas anos-calendário fechados)
    end_year = common_end.year
    start_year = end_year - 30
    start_year_month = common_start.strftime("%Y-%m")
    end_year_month = common_end.strftime("%Y-%m")

    result = {
        "era5_latest_date": era5_date.strftime("%Y-%m-%d"),
        "merra2_latest_date": merra2_date.strftime("%Y-%m-%d"),
        "common_end_date": common_end.strftime("%Y-%m-%d"),
        "common_start_date": common_start.strftime("%Y-%m-%d"),
        "start_year": start_year,
        "end_year": end_year,
        "start_year_month": start_year_month,
        "end_year_month": end_year_month,
        "total_years": 30,
        "limiting_model": limiting_model,
        "explanation": (
            f"Emparelhado pelo modelo mais defasado ({limiting_model}: {end_year_month}). "
            f"ERA5 até {era5_date.strftime('%Y-%m')} | MERRA-2 até {merra2_date.strftime('%Y-%m')}. "
            f"Janela de 30 anos sincronizada: {start_year_month} até {end_year_month}."
        ),
    }

    _cached_date_range = result
    _last_check_time = now_ts
    logger.info(f"Intervalo de 30 anos emparelhado calculado com sucesso: {result['explanation']}")
    return result


def filter_df_by_period(
    df: Any,
    start_month: str | None = None,
    end_month: str | None = None,
) -> Any:
    """Filtra um DataFrame Polars por janela ano-mês exata (ex: '1996-08' a '2026-08')."""
    import polars as pl

    if not isinstance(df, pl.DataFrame) or len(df) == 0:
        return df

    filtered = df

    if start_month:
        try:
            start_dt = datetime.strptime(f"{start_month}-01", "%Y-%m-%d")
            filtered = filtered.filter(pl.col("timestamp") >= start_dt)
        except Exception as e:
            logger.warning(f"Não foi possível aplicar filtro de início ({start_month}): {e}")

    if end_month:
        try:
            parts = end_month.split("-")
            yr, mo = int(parts[0]), int(parts[1])
            if mo == 12:
                next_month_dt = datetime(yr + 1, 1, 1)
            else:
                next_month_dt = datetime(yr, mo + 1, 1)
            filtered = filtered.filter(pl.col("timestamp") < next_month_dt)
        except Exception as e:
            logger.warning(f"Não foi possível aplicar filtro de fim ({end_month}): {e}")

    return filtered

