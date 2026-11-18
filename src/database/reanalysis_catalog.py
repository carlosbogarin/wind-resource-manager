from __future__ import annotations

import logging
import re
from datetime import datetime
from pathlib import Path
from typing import Any

import duckdb
import polars as pl

from src.core.config import settings
from src.paths import CATALOG_DB_PATH

logger = logging.getLogger("database.reanalysis_catalog")


def _get_connection() -> duckdb.DuckDBPyConnection:
    settings.DATA_DIR.mkdir(parents=True, exist_ok=True)
    con = duckdb.connect(str(CATALOG_DB_PATH))
    con.execute("""
        CREATE TABLE IF NOT EXISTS reanalysis_node_registry (
            node_key VARCHAR PRIMARY KEY,
            model VARCHAR,
            node_id VARCHAR,
            latitude DOUBLE,
            longitude DOUBLE,
            min_timestamp TIMESTAMP,
            max_timestamp TIMESTAMP,
            total_records INTEGER,
            file_path VARCHAR,
            file_size_mb DOUBLE,
            last_sync_at TIMESTAMP,
            status VARCHAR
        );
    """)
    return con


def make_node_key(model: str, lat: float, lon: float) -> str:
    """Gera chave única canônica para o ponto de grade da reanálise."""
    return f"{model.upper()}_{lat:.4f}_{lon:.4f}"


def upsert_node_record(
    model: str,
    node_id: str,
    lat: float,
    lon: float,
    min_timestamp: datetime,
    max_timestamp: datetime,
    total_records: int,
    file_path: Path | str,
    file_size_mb: float,
    status: str = "COMPLETED",
) -> None:
    """Cadastra ou atualiza o nó baixado no catálogo DuckDB."""
    key = make_node_key(model, lat, lon)
    now = datetime.now()
    con = _get_connection()
    try:
        con.execute(
            """
            INSERT OR REPLACE INTO reanalysis_node_registry (
                node_key, model, node_id, latitude, longitude,
                min_timestamp, max_timestamp, total_records,
                file_path, file_size_mb, last_sync_at, status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            [
                key,
                model.upper(),
                node_id,
                round(lat, 4),
                round(lon, 4),
                min_timestamp,
                max_timestamp,
                total_records,
                str(file_path),
                round(file_size_mb, 2),
                now,
                status,
            ],
        )
        logger.info(
            f"Catálogo DuckDB atualizado: {key} ({total_records} registros até {max_timestamp.strftime('%Y-%m-%d %H:%M')})"
        )
    finally:
        con.close()


def get_node_record(model: str, lat: float, lon: float) -> dict[str, Any] | None:
    """Consulta o histórico e status de sincronização de um nó no banco DuckDB."""
    key = make_node_key(model, lat, lon)
    con = _get_connection()
    try:
        res = con.execute(
            """
            SELECT node_key, model, node_id, latitude, longitude,
                   min_timestamp, max_timestamp, total_records,
                   file_path, file_size_mb, last_sync_at, status
            FROM reanalysis_node_registry
            WHERE node_key = ?
            """,
            [key],
        ).fetchone()

        if not res:
            return None

        return {
            "node_key": res[0],
            "model": res[1],
            "node_id": res[2],
            "latitude": res[3],
            "longitude": res[4],
            "min_timestamp": res[5],
            "max_timestamp": res[6],
            "total_records": res[7],
            "file_path": res[8],
            "file_size_mb": res[9],
            "last_sync_at": res[10],
            "status": res[11],
        }
    finally:
        con.close()


def list_all_downloaded_nodes() -> list[dict[str, Any]]:
    """Lista todos os nós já baixados e persistidos no banco DuckDB."""
    con = _get_connection()
    try:
        rows = con.execute(
            """
            SELECT node_key, model, node_id, latitude, longitude,
                   min_timestamp, max_timestamp, total_records,
                   file_path, file_size_mb, last_sync_at, status
            FROM reanalysis_node_registry
            ORDER BY last_sync_at DESC
            """
        ).fetchall()

        return [
            {
                "node_key": r[0],
                "model": r[1],
                "node_id": r[2],
                "latitude": r[3],
                "longitude": r[4],
                "min_timestamp": r[5],
                "max_timestamp": r[6],
                "total_records": r[7],
                "file_path": r[8],
                "file_size_mb": r[9],
                "last_sync_at": r[10],
                "status": r[11],
            }
            for r in rows
        ]
    finally:
        con.close()


def is_node_cached_in_db(model: str, lat: float, lon: float) -> bool:
    """Verifica se um nó canônico (modelo, latitude, longitude) está presente no banco DuckDB e com arquivo existente no disco."""
    rec = get_node_record(model, lat, lon)
    if not rec:
        return False
    file_path = Path(rec["file_path"])
    return file_path.exists() and rec["total_records"] > 0


def sync_reanalysis_disk_to_duckdb() -> int:
    """Escaneia o diretório de dados de reanálise e cataloga no DuckDB qualquer arquivo Parquet ainda não registrado.
    
    Garante sincronização bidirecional entre disco e banco DuckDB, permitindo que nós baixados
    por qualquer projeto ou consulta manual sejam imediatamente reutilizados.
    """
    settings.REANALYSIS_DIR.mkdir(parents=True, exist_ok=True)
    parquet_files = list(settings.REANALYSIS_DIR.glob("*.parquet"))
    synced_count = 0

    for pf in parquet_files:
        filename = pf.name.lower()
        if filename.startswith("vortex_") or "test" in filename:
            continue

        if filename.startswith("era5_"):
            model = "ERA5"
        elif filename.startswith("merra2_"):
            model = "MERRA-2"
        else:
            continue

        try:
            df = pl.read_parquet(pf)
            if "timestamp" not in df.columns or len(df) == 0:
                continue

            # Extrai coordenadas canônicas
            if "latitude" in df.columns and "longitude" in df.columns:
                lat = float(df["latitude"][0])
                lon = float(df["longitude"][0])
            else:
                coords_match = re.findall(r"([+-]?\d+\.\d+)", filename)
                if len(coords_match) >= 2:
                    lat = float(coords_match[0])
                    lon = float(coords_match[1])
                else:
                    continue

            node_id = str(df["node_id"][0]) if "node_id" in df.columns else f"{model}_{lat:.4f}_{lon:.4f}"
            min_ts = df["timestamp"].min()
            max_ts = df["timestamp"].max()
            file_mb = pf.stat().st_size / (1024 * 1024)

            upsert_node_record(
                model=model,
                node_id=node_id,
                lat=lat,
                lon=lon,
                min_timestamp=min_ts,
                max_timestamp=max_ts,
                total_records=len(df),
                file_path=pf,
                file_size_mb=file_mb,
            )
            synced_count += 1
        except Exception as e:
            logger.warning(f"Erro ao catalogar arquivo {pf.name} no DuckDB: {e}")

    logger.info(f"Sincronização DuckDB concluída: {synced_count} nós de reanálise indexados.")
    return synced_count
