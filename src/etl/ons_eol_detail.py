from __future__ import annotations

import logging
import re
from pathlib import Path
from typing import Any

import duckdb
import polars as pl

from src.core.config import settings

logger = logging.getLogger("etl.ons_eol_detail")


def get_eol_detail_cache_dir() -> Path:
    """Retorna o diretório de cache local para séries extraídas do ONS EOL Detailed."""
    cache_dir = settings.DATA_DIR / "ons_eolica_detail" / "cache"
    cache_dir.mkdir(parents=True, exist_ok=True)
    return cache_dir


def sanitize_filename(name: str) -> str:
    """Gera um nome seguro para arquivo Parquet a partir do identificador do conjunto."""
    clean = re.sub(r"[^\w\-]", "_", name.strip())
    return re.sub(r"_+", "_", clean).strip("_")


def get_cache_path(ensemble_name: str, id_ons: str | None = None) -> Path:
    """Retorna o caminho do arquivo Parquet em cache para um conjunto eólico."""
    cache_dir = get_eol_detail_cache_dir()
    identifier = id_ons or ensemble_name
    filename = f"ons_measured_{sanitize_filename(identifier)}.parquet"
    return cache_dir / filename


def fetch_ensemble_measured_series(
    ensemble_name: str,
    id_ons: str | None = None,
    force: bool = False,
) -> pl.DataFrame | None:
    """Extrai e consolida a série temporal medida horária do conjunto a partir dos Parquets do ONS EOL Detailed.
    
    Busca no acervo de arquivos mensais (ex: 2023 a 2026), filtra registros válidos de vento
    (flg_dadoventoinvalido == 0 e val_ventoverificado IS NOT NULL) e salva em cache Parquet local.
    """
    cache_path = get_cache_path(ensemble_name, id_ons)
    if cache_path.exists() and not force:
        try:
            return pl.read_parquet(cache_path)
        except Exception as e:
            logger.warning(f"Falha ao ler cache Parquet de vento medido ONS ({cache_path}): {e}. Recarregando...")

    detail_dir = settings.ONS_EOL_DETAIL_DIR
    if not detail_dir.exists():
        logger.warning(f"Diretório ONS EOL Detailed não encontrado: {detail_dir}")
        return None

    parquet_files = list(detail_dir.glob("*.parquet"))
    if not parquet_files:
        logger.warning(f"Nenhum arquivo Parquet encontrado em {detail_dir}")
        return None

    files_pattern = (detail_dir / "*.parquet").as_posix()

    # Prepara padrões de busca para cobrir acentuação e variações de grafia
    clean_name = ensemble_name.strip()
    # Remove prefixo 'Conj.' para busca flexível
    stripped_name = re.sub(r"^Conj\.\s*", "", clean_name, flags=re.IGNORECASE).strip()
    # Gera padrão LIKE com wildcard entre palavras
    words = re.findall(r"\w+", stripped_name)
    like_pattern = f"%{'%'.join(words)}%" if words else f"%{clean_name}%"

    con = duckdb.connect(":memory:")
    query = f"""
        SELECT 
            DATE_TRUNC('hour', CAST(din_instante AS TIMESTAMP)) AS timestamp,
            ROUND(AVG(val_ventoverificado), 2) AS wind_speed_measured,
            ROUND(AVG(val_geracaoverificada), 2) AS generation_measured_mw,
            COUNT(*) AS sample_count
        FROM read_parquet('{files_pattern}')
        WHERE (
            UPPER(nom_conjuntousina) = UPPER(?) 
            OR nom_conjuntousina ILIKE ? 
            OR nom_conjuntousina ILIKE ?
        )
          AND val_ventoverificado IS NOT NULL
          AND COALESCE(flg_dadoventoinvalido, 0) = 0
        GROUP BY 1
        ORDER BY 1
    """

    try:
        tbl = con.execute(query, [clean_name, f"%{clean_name}%", like_pattern]).to_arrow_table()
        con.close()
        if tbl.num_rows == 0:
            logger.info(f"Nenhum registro de vento medido encontrado no ONS EOL Detailed para '{clean_name}'.")
            return None

        df = pl.from_arrow(tbl).sort("timestamp")
        df.write_parquet(cache_path)
        logger.info(
            f"Série medida ONS gravada em cache para {clean_name} ({len(df)} horas, {cache_path.stat().st_size / 1024:.1f} KB)"
        )
        return df
    except Exception as e:
        logger.error(f"Erro ao consultar ONS EOL Detailed para '{clean_name}': {e}")
        con.close()
        return None


def get_aggregated_measured_series(
    df: pl.DataFrame | None,
    start_month: str | None = None,
    end_month: str | None = None,
    aggregation: str = "daily",
) -> list[dict[str, Any]]:
    """Agrega a série horária de vento medido ONS em resolução diária, mensal ou horária."""
    if df is None or len(df) == 0:
        return []

    # Filtrar por período se fornecido (formato AAAA-MM)
    filtered_df = df
    if start_month:
        try:
            start_ts = pl.lit(f"{start_month}-01 00:00:00").str.to_datetime("%Y-%m-%d %H:%M:%S")
            filtered_df = filtered_df.filter(pl.col("timestamp") >= start_ts)
        except Exception:
            pass

    if end_month:
        try:
            # Primeiro dia do mês seguinte como limite superior exclusivo
            y, m = map(int, end_month.split("-"))
            next_m = m + 1 if m < 12 else 1
            next_y = y if m < 12 else y + 1
            end_ts = pl.lit(f"{next_y:04d}-{next_m:02d}-01 00:00:00").str.to_datetime("%Y-%m-%d %H:%M:%S")
            filtered_df = filtered_df.filter(pl.col("timestamp") < end_ts)
        except Exception:
            pass

    if len(filtered_df) == 0:
        return []

    if aggregation == "daily":
        agg = (
            filtered_df.with_columns(pl.col("timestamp").dt.date().alias("date"))
            .group_by("date")
            .agg(
                [
                    pl.col("wind_speed_measured").mean().round(2).alias("wind_speed_measured"),
                    pl.col("generation_measured_mw").mean().round(2).alias("generation_measured_mw"),
                ]
            )
            .sort("date")
        )
        return [
            {
                "time": row["date"].strftime("%Y-%m-%d"),
                "speed_measured": row["wind_speed_measured"],
                "generation_mw": row["generation_measured_mw"],
            }
            for row in agg.iter_rows(named=True)
        ]

    elif aggregation == "monthly":
        agg = (
            filtered_df.with_columns(pl.col("timestamp").dt.strftime("%Y-%m").alias("mes_ano"))
            .group_by("mes_ano")
            .agg(
                [
                    pl.col("wind_speed_measured").mean().round(2).alias("wind_speed_measured"),
                    pl.col("generation_measured_mw").mean().round(2).alias("generation_measured_mw"),
                ]
            )
            .sort("mes_ano")
        )
        return [
            {
                "time": row["mes_ano"],
                "speed_measured": row["wind_speed_measured"],
                "generation_mw": row["generation_measured_mw"],
            }
            for row in agg.iter_rows(named=True)
        ]

    else:
        # Horário
        return [
            {
                "time": row["timestamp"].strftime("%Y-%m-%d %H:%M"),
                "speed_measured": row["wind_speed_measured"],
                "generation_mw": row["generation_measured_mw"],
            }
            for row in filtered_df.iter_rows(named=True)
        ]
