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
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any

import polars as pl

from src.core.config import settings
from src.database.reanalysis_catalog import upsert_node_record

logger = logging.getLogger("merra2_client")


def _get_ssl_context() -> ssl.SSLContext:
    """Cria contexto SSL resiliente para requisições externas."""
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    return ctx


def find_existing_merra2_file(lat: float, lon: float) -> Path | None:
    """Localiza qualquer arquivo Parquet existente para as coordenadas exatas da grade MERRA-2."""
    settings.REANALYSIS_DIR.mkdir(parents=True, exist_ok=True)
    pattern = f"merra2_*_{lat:.4f}_{lon:.4f}_*.parquet"
    matches = sorted(
        settings.REANALYSIS_DIR.glob(pattern),
        key=lambda p: p.stat().st_mtime,
        reverse=True,
    )
    return matches[0] if matches else None


def get_merra2_cache_path(node_id: str, lat: float, lon: float, start_year: int, end_year: int) -> Path:
    """Gera caminho de arquivo padronizado para cache em Parquet do MERRA-2."""
    settings.REANALYSIS_DIR.mkdir(parents=True, exist_ok=True)
    clean_id = node_id.replace(" ", "_").replace("-", "_")
    filename = f"merra2_{clean_id}_{lat:.4f}_{lon:.4f}_{start_year}_{end_year}.parquet"
    return settings.REANALYSIS_DIR / filename


# Locks granulares por coordenada para sincronizar downloads concorrentes e evitar duplicação do mesmo nó
_merra2_node_locks: dict[str, threading.Lock] = {}
_merra2_locks_guard = threading.Lock()


def _get_merra2_node_lock(lat: float, lon: float) -> threading.Lock:
    """Retorna lock individual por coordenada para permitir downloads paralelos de nós distintos."""
    key = f"{lat:.4f}_{lon:.4f}"
    with _merra2_locks_guard:
        if key not in _merra2_node_locks:
            _merra2_node_locks[key] = threading.Lock()
        return _merra2_node_locks[key]


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
    """Baixa e processa série histórica do MERRA-2 com suporte a append incremental."""
    cache_path = get_merra2_cache_path(node_id, lat, lon, start_year, end_year)
    existing_file = find_existing_merra2_file(lat, lon)
    # Obter data mais recente efetivamente disponível na NASA (evita falsos deltas com o dia de hoje)
    today_fmt = datetime.now().strftime("%Y%m%d")
    try:
        from src.etl.date_range_checker import check_merra2_latest_date
        merra2_avail_dt = check_merra2_latest_date()
        target_end_dt = min(datetime(end_year, 12, 31), merra2_avail_dt)
    except Exception:
        target_end_dt = min(datetime(end_year, 12, 31), datetime.now() - timedelta(days=15))
    target_end_fmt = target_end_dt.strftime("%Y%m%d")
    earliest_nasa_hourly = "20010101"

    # 1. Se já existe arquivo Parquet e não é force, verifica se podemos reaproveitar ou fazer incremento delta
    if existing_file and existing_file.exists() and not force:
        try:
            df_existing = pl.read_parquet(existing_file)
            if len(df_existing) > 0:
                max_ts = df_existing["timestamp"].max()
                min_ts = df_existing["timestamp"].min()
                max_ts_fmt = max_ts.strftime("%Y%m%d")

                if max_ts_fmt >= target_end_fmt:
                    logger.info(f"Série MERRA-2 já em cache e 100% atualizada até {max_ts_fmt}: {existing_file}")
                    upsert_node_record(
                        model="MERRA-2",
                        node_id=node_id,
                        lat=lat,
                        lon=lon,
                        min_timestamp=min_ts,
                        max_timestamp=max_ts,
                        total_records=len(df_existing),
                        file_path=existing_file,
                        file_size_mb=existing_file.stat().st_size / (1024 * 1024),
                    )
                    return existing_file

                # 2. Incremento Delta
                with _get_merra2_node_lock(lat, lon):
                    inc_start_dt = max_ts + timedelta(days=1)
                    inc_start_fmt = inc_start_dt.strftime("%Y%m%d")

                    if inc_start_fmt <= target_end_fmt:
                        logger.info(
                            f"Base MERRA-2 existente até {max_ts_fmt}. Baixando DELTA de {inc_start_fmt} a {target_end_fmt}..."
                        )
                        delta_params = fetch_nasa_power_merra2_chunk(lat, lon, inc_start_fmt, target_end_fmt)
                        d_ws50 = delta_params.get("WS50M", {})
                        d_ws10 = delta_params.get("WS10M", {})
                        d_wd50 = delta_params.get("WD50M", {})
                        d_wd10 = delta_params.get("WD10M", {})
                        d_ps = delta_params.get("PS", {})
                        d_t2m = delta_params.get("T2M", {})

                        d_times = sorted(d_ws50.keys())
                        if d_times:
                            d_timestamps = []
                            d_ws100_list = []
                            d_ws10_list = []
                            d_wd100_list = []
                            d_wd10_list = []
                            d_ps_list = []
                            d_t2m_list = []

                            for t_str in d_times:
                                try:
                                    dt = datetime.strptime(t_str, "%Y%m%d%H")
                                except ValueError:
                                    continue

                                v50 = d_ws50.get(t_str)
                                v10 = d_ws10.get(t_str)
                                if v50 is not None and v50 >= 0:
                                    if v10 is not None and v10 > 0.1 and v50 > 0.1:
                                        alpha = math.log(v50 / v10) / math.log(50.0 / 10.0)
                                        alpha = max(0.05, min(alpha, 0.45))
                                    else:
                                        alpha = 0.143
                                    v100 = round(v50 * ((100.0 / 50.0) ** alpha), 2)
                                else:
                                    v100 = 0.0

                                d_timestamps.append(dt)
                                d_ws100_list.append(v100)
                                d_ws10_list.append(float(v10) if v10 is not None and v10 >= 0 else 0.0)
                                d_wd100_list.append(float(d_wd50.get(t_str, 0.0)))
                                d_wd10_list.append(float(d_wd10.get(t_str, 0.0)))
                                d_ps_list.append(float(d_ps.get(t_str, 1013.25)))
                                d_t2m_list.append(float(d_t2m.get(t_str, 25.0)))

                            delta_df = pl.DataFrame(
                                {
                                    "timestamp": d_timestamps,
                                    "wind_speed_100m": d_ws100_list,
                                    "wind_speed_10m": d_ws10_list,
                                    "wind_direction_100m": d_wd100_list,
                                    "wind_direction_10m": d_wd10_list,
                                    "surface_pressure_hpa": d_ps_list,
                                    "temperature_2m_c": d_t2m_list,
                                    "node_id": [node_id] * len(d_timestamps),
                                    "model": ["MERRA-2"] * len(d_timestamps),
                                    "latitude": [lat] * len(d_timestamps),
                                    "longitude": [lon] * len(d_timestamps),
                                }
                            )
                            combined_df = (
                                pl.concat([df_existing, delta_df])
                                .unique(subset=["timestamp"])
                                .sort("timestamp")
                            )
                            combined_df.write_parquet(cache_path)
                            if existing_file != cache_path and existing_file.exists():
                                existing_file.unlink(missing_ok=True)

                            c_min = combined_df["timestamp"].min()
                            c_max = combined_df["timestamp"].max()
                            file_mb = cache_path.stat().st_size / (1024 * 1024)
                            upsert_node_record(
                                model="MERRA-2",
                                node_id=node_id,
                                lat=lat,
                                lon=lon,
                                min_timestamp=c_min,
                                max_timestamp=c_max,
                                total_records=len(combined_df),
                                file_path=cache_path,
                                file_size_mb=file_mb,
                            )
                            logger.info(
                                f"Série MERRA-2 incrementada com sucesso! +{len(delta_df)} horas adicionadas. Total: {len(combined_df)} horas."
                            )
                            return cache_path
        except Exception as e:
            logger.warning(f"Erro ao verificar incremento MERRA-2 ({e}). Procedendo com download completo...")

    # 3. Download completo
    with _get_merra2_node_lock(lat, lon):
        if cache_path.exists() and not force:
            return cache_path
        fresh_existing = find_existing_merra2_file(lat, lon)
        if fresh_existing and fresh_existing.exists() and not force:
            return fresh_existing

        logger.info(
            f"Iniciando download completo da série temporal MERRA-2 ({start_year}-{end_year}) para o nó {node_id} ({lat}, {lon})..."
        )

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

            hourly_times = sorted(ws50_dict.keys())
            if not hourly_times:
                continue

            timestamps = []
            ws100_list = []
            ws10_list = []
            wd50_list = []
            wd10_list = []
            ps_list = []
            t2m_list = []

            for t_str in hourly_times:
                try:
                    dt = datetime.strptime(t_str, "%Y%m%d%H")
                except ValueError:
                    continue

                v50 = ws50_dict.get(t_str)
                v10 = ws10_dict.get(t_str)
                if v50 is not None and v50 >= 0:
                    if v10 is not None and v10 > 0.1 and v50 > 0.1:
                        alpha = math.log(v50 / v10) / math.log(50.0 / 10.0)
                        alpha = max(0.05, min(alpha, 0.45))
                    else:
                        alpha = 0.143
                    v100 = round(v50 * ((100.0 / 50.0) ** alpha), 2)
                else:
                    v100 = 0.0

                timestamps.append(dt)
                ws100_list.append(v100)
                ws10_list.append(float(v10) if v10 is not None and v10 >= 0 else 0.0)
                wd50_list.append(float(wd50_dict.get(t_str, 0.0)))
                wd10_list.append(float(wd10_dict.get(t_str, 0.0)))
                ps_list.append(float(ps_dict.get(t_str, 1013.25)))
                t2m_list.append(float(t2m_dict.get(t_str, 25.0)))

            n_rows = len(timestamps)
            chunk_df = pl.DataFrame(
                {
                    "timestamp": timestamps,
                    "wind_speed_100m": ws100_list,
                    "wind_speed_10m": ws10_list,
                    "wind_direction_100m": wd50_list,
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

        final_df = pl.concat(all_dfs).unique(subset=["timestamp"]).sort("timestamp")
        final_df.write_parquet(cache_path)

        min_ts = final_df["timestamp"].min()
        max_ts = final_df["timestamp"].max()
        file_mb = cache_path.stat().st_size / (1024 * 1024)
        upsert_node_record(
            model="MERRA-2",
            node_id=node_id,
            lat=lat,
            lon=lon,
            min_timestamp=min_ts,
            max_timestamp=max_ts,
            total_records=len(final_df),
            file_path=cache_path,
            file_size_mb=file_mb,
        )

        logger.info(
            f"Série MERRA-2 salva em {cache_path} ({len(final_df)} registros, {file_mb:.2f} MB)"
        )
        return cache_path


def _normalize_merra2_df(df: pl.DataFrame | None) -> pl.DataFrame | None:
    """Garante que a coluna wind_direction_100m esteja sempre presente nos DataFrames do MERRA-2."""
    if df is None:
        return None
    if "wind_direction_100m" not in df.columns:
        if "wind_direction_50m" in df.columns:
            df = df.with_columns(pl.col("wind_direction_50m").alias("wind_direction_100m"))
        elif "wind_direction_10m" in df.columns:
            df = df.with_columns(pl.col("wind_direction_10m").alias("wind_direction_100m"))
        else:
            df = df.with_columns(pl.lit(0.0).alias("wind_direction_100m"))
    return df


def load_merra2_series(
    node_id: str,
    lat: float,
    lon: float,
    start_year: int = 1996,
    end_year: int = 2026,
    auto_fetch: bool = False,
) -> pl.DataFrame | None:
    """Carrega série temporal do MERRA-2 a partir do cache Parquet com resolução de arquivos existentes."""
    cache_path = get_merra2_cache_path(node_id, lat, lon, start_year, end_year)
    if not cache_path.exists():
        existing_file = find_existing_merra2_file(lat, lon)
        if existing_file and existing_file.exists():
            return _normalize_merra2_df(pl.read_parquet(existing_file))
        if auto_fetch:
            fetch_and_cache_merra2(node_id, lat, lon, start_year, end_year)
            if cache_path.exists():
                return _normalize_merra2_df(pl.read_parquet(cache_path))
        return None
    return _normalize_merra2_df(pl.read_parquet(cache_path))
