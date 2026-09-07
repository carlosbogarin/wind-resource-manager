from __future__ import annotations

import json
import logging
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

logger = logging.getLogger("era5_client")

# Lock para sincronizar downloads concorrentes e evitar duplicação de chamadas
_era5_download_lock = threading.Lock()


def _get_ssl_context() -> ssl.SSLContext:
    """Cria contexto SSL resiliente para downloads em qualquer ambiente."""
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    return ctx


def find_existing_era5_file(lat: float, lon: float) -> Path | None:
    """Localiza qualquer arquivo Parquet existente para as coordenadas exatas da grade ERA5."""
    settings.REANALYSIS_DIR.mkdir(parents=True, exist_ok=True)
    pattern = f"era5_*_{lat:.4f}_{lon:.4f}_*.parquet"
    matches = sorted(
        settings.REANALYSIS_DIR.glob(pattern),
        key=lambda p: p.stat().st_mtime,
        reverse=True,
    )
    return matches[0] if matches else None


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
    max_retries: int = 4,
) -> dict[str, Any]:
    """Busca um bloco de série temporal horária de reanálise ERA5 via Open-Meteo Archive API com retry e backoff em 429."""
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

    for attempt in range(max_retries):
        try:
            with urllib.request.urlopen(req, context=ctx, timeout=60) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                return data.get("hourly", {})
        except urllib.error.HTTPError as e:
            if e.code == 429:
                # Rate limit atingido: aplicar backoff exponencial
                retry_after_hdr = e.headers.get("Retry-After")
                if retry_after_hdr and retry_after_hdr.isdigit():
                    wait_sec = float(retry_after_hdr) + random.uniform(0.5, 1.5)
                else:
                    wait_sec = (2 ** (attempt + 1)) + random.uniform(1.0, 3.0)

                logger.warning(
                    f"Open-Meteo Rate Limit 429 ao baixar {start_date} a {end_date}. "
                    f"Aguardando {wait_sec:.1f}s antes de tentar novamente (tentativa {attempt + 1}/{max_retries})..."
                )
                time.sleep(wait_sec)
                continue
            elif e.code == 400:
                # Tratar eventual ajuste fino de data máxima
                body = e.read().decode("utf-8")
                logger.error(f"Erro 400 Open-Meteo ({url}): {body}")
                raise ValueError(f"Requisição inválida Open-Meteo: {body}")
            else:
                if attempt < max_retries - 1:
                    wait_sec = 2.0 * (attempt + 1)
                    logger.warning(f"Erro HTTP {e.code} ({e.reason}). Tentando novamente em {wait_sec}s...")
                    time.sleep(wait_sec)
                    continue
                raise
        except Exception as ex:
            if attempt < max_retries - 1:
                time.sleep(2.0)
                continue
            raise ex

    raise RuntimeError(f"Falha ao obter dados ERA5 para o intervalo {start_date} a {end_date} após {max_retries} tentativas.")


def fetch_and_cache_era5(
    node_id: str,
    lat: float,
    lon: float,
    start_year: int = 1996,
    end_year: int = 2026,
    force: bool = False,
) -> Path:
    """Baixa a série temporal histórica de reanálise ERA5 com suporte a append incremental."""
    cache_path = get_era5_cache_path(node_id, lat, lon, start_year, end_year)
    existing_file = find_existing_era5_file(lat, lon)
    today_str = datetime.now().strftime("%Y-%m-%d")
    target_end_str = min(f"{end_year}-12-31", today_str)

    # 1. Se já existe arquivo Parquet e não é force, verifica se podemos reaproveitar ou fazer incremento delta
    if existing_file and existing_file.exists() and not force:
        try:
            df_existing = pl.read_parquet(existing_file)
            if len(df_existing) > 0:
                max_ts = df_existing["timestamp"].max()
                min_ts = df_existing["timestamp"].min()
                max_ts_str = max_ts.strftime("%Y-%m-%d")

                # Se a base já possui dados até a data limite solicitada, está 100% atualizada
                if max_ts_str >= target_end_str:
                    logger.info(f"Série ERA5 já em cache e 100% atualizada até {max_ts_str}: {existing_file}")
                    upsert_node_record(
                        model="ERA5",
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

                # 2. INCREMENTO DELTA: base existe com histórico de 30 anos, baixa apenas o período faltante
                with _era5_download_lock:
                    inc_start_dt = max_ts + timedelta(hours=1)
                    inc_start_str = inc_start_dt.strftime("%Y-%m-%d")

                    if inc_start_str <= target_end_str:
                        logger.info(
                            f"Base existente até {max_ts_str}. Baixando apenas o DELTA incremental de {inc_start_str} a {target_end_str}..."
                        )
                        delta_hourly = fetch_era5_timeseries_chunk(lat, lon, inc_start_str, target_end_str)
                        d_times = delta_hourly.get("time", [])
                        if d_times:
                            d_rows = len(d_times)
                            delta_df = pl.DataFrame(
                                {
                                    "timestamp": [datetime.strptime(t, "%Y-%m-%dT%H:%M") for t in d_times],
                                    "wind_speed_100m": [float(v) if v is not None else 0.0 for v in delta_hourly.get("wind_speed_100m", [])],
                                    "wind_speed_10m": [float(v) if v is not None else 0.0 for v in delta_hourly.get("wind_speed_10m", [])],
                                    "wind_direction_100m": [float(v) if v is not None else 0.0 for v in delta_hourly.get("wind_direction_100m", [])],
                                    "wind_direction_10m": [float(v) if v is not None else 0.0 for v in delta_hourly.get("wind_direction_10m", [])],
                                    "surface_pressure_hpa": [float(v) if v is not None else 1013.25 for v in delta_hourly.get("surface_pressure", [])],
                                    "temperature_2m_c": [float(v) if v is not None else 25.0 for v in delta_hourly.get("temperature_2m", [])],
                                    "node_id": [node_id] * d_rows,
                                    "model": ["ERA5"] * d_rows,
                                    "latitude": [lat] * d_rows,
                                    "longitude": [lon] * d_rows,
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
                                model="ERA5",
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
                                f"Série ERA5 incrementada com sucesso! +{len(delta_df)} horas adicionadas. Total: {len(combined_df)} horas."
                            )
                            return cache_path
        except Exception as e:
            logger.warning(f"Erro ao verificar incremento de base existente ({e}). Procedendo com download completo...")

    # 3. Download completo (primeira vez ou quando forçado)
    with _era5_download_lock:
        if cache_path.exists() and not force:
            return cache_path

        logger.info(
            f"Iniciando download completo da série temporal ERA5 ({start_year}-{end_year}) para o nó {node_id} ({lat}, {lon})..."
        )

        chunk_size_years = 10
        all_dfs: list[pl.DataFrame] = []

        for curr_start in range(start_year, end_year + 1, chunk_size_years):
            curr_end = min(curr_start + chunk_size_years - 1, end_year)
            start_date = f"{curr_start}-01-01"
            candidate_end = f"{curr_end}-12-31"
            end_date = min(candidate_end, today_str)

            if start_date > today_str:
                break

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

            n_rows = len(times)
            chunk_df = pl.DataFrame(
                {
                    "timestamp": [datetime.strptime(t, "%Y-%m-%dT%H:%M") for t in times],
                    "wind_speed_100m": [float(v) if v is not None else 0.0 for v in ws100],
                    "wind_speed_10m": [float(v) if v is not None else 0.0 for v in ws10],
                    "wind_direction_100m": [float(v) if v is not None else 0.0 for v in wd100],
                    "wind_direction_10m": [float(v) if v is not None else 0.0 for v in wd10],
                    "surface_pressure_hpa": [float(v) if v is not None else 1013.25 for v in pressure],
                    "temperature_2m_c": [float(v) if v is not None else 25.0 for v in temp],
                    "node_id": [node_id] * n_rows,
                    "model": ["ERA5"] * n_rows,
                    "latitude": [lat] * n_rows,
                    "longitude": [lon] * n_rows,
                }
            )
            all_dfs.append(chunk_df)
            time.sleep(1.2)

        if not all_dfs:
            raise ValueError(f"Nenhum dado retornado para o nó {node_id} ({lat}, {lon})")

        final_df = pl.concat(all_dfs).unique(subset=["timestamp"]).sort("timestamp")
        final_df.write_parquet(cache_path)

        min_ts = final_df["timestamp"].min()
        max_ts = final_df["timestamp"].max()
        file_mb = cache_path.stat().st_size / (1024 * 1024)
        upsert_node_record(
            model="ERA5",
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
            f"Série ERA5 salva com sucesso em {cache_path} ({len(final_df)} registros horários, {file_mb:.2f} MB)"
        )
        return cache_path


def load_era5_series(
    node_id: str,
    lat: float,
    lon: float,
    start_year: int = 1996,
    end_year: int = 2026,
    auto_fetch: bool = False,
) -> pl.DataFrame | None:
    """Carrega série temporal do ERA5 a partir do cache Parquet com resolução de arquivos existentes."""
    cache_path = get_era5_cache_path(node_id, lat, lon, start_year, end_year)
    if not cache_path.exists():
        existing_file = find_existing_era5_file(lat, lon)
        if existing_file and existing_file.exists():
            return pl.read_parquet(existing_file)
        if auto_fetch:
            fetch_and_cache_era5(node_id, lat, lon, start_year, end_year)
            if cache_path.exists():
                return pl.read_parquet(cache_path)
        return None
    return pl.read_parquet(cache_path)

