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
    cache_dir = settings.ONS_EOL_DETAIL_CACHE_DIR
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

    Gera séries individuais por usina (nom_usina) e a série consolidada 'Média do Conjunto',
    computando a velocidade medida válida e a taxa de flags de vento inválido (flg_dadoventoinvalido).
    """
    cache_path = get_cache_path(ensemble_name, id_ons)
    if cache_path.exists() and not force:
        try:
            df = pl.read_parquet(cache_path)
            # Verifica se o cache possui a nova coluna 'nom_usina'
            if "nom_usina" in df.columns:
                return df
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
    stripped_name = re.sub(r"^Conj\.\s*", "", clean_name, flags=re.IGNORECASE).strip()
    words = re.findall(r"\w+", stripped_name)
    like_pattern = f"%{'%'.join(words)}%" if words else f"%{clean_name}%"

    con = duckdb.connect(":memory:")
    query = f"""
        WITH raw_hourly_plant AS (
            SELECT 
                DATE_TRUNC('hour', CAST(din_instante AS TIMESTAMP)) AS timestamp,
                nom_usina,
                ROUND(AVG(CASE WHEN COALESCE(flg_dadoventoinvalido, 0) = 0 THEN val_ventoverificado ELSE NULL END), 2) AS wind_speed_measured,
                ROUND(AVG(val_ventoverificado), 2) AS wind_speed_raw,
                ROUND(SUM(CASE WHEN flg_dadoventoinvalido = 1.0 THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 2) AS invalid_flag_pct,
                SUM(CASE WHEN flg_dadoventoinvalido = 1.0 THEN 1 ELSE 0 END) AS invalid_flag_count,
                ROUND(AVG(val_geracaoverificada), 2) AS generation_measured_mw,
                COUNT(*) AS sample_count
            FROM read_parquet('{files_pattern}')
            WHERE (
                UPPER(nom_conjuntousina) = UPPER(?) 
                OR nom_conjuntousina ILIKE ? 
                OR nom_conjuntousina ILIKE ?
            )
            GROUP BY 1, 2
        ),
        raw_hourly_ensemble AS (
            SELECT 
                DATE_TRUNC('hour', CAST(din_instante AS TIMESTAMP)) AS timestamp,
                'Média do Conjunto' AS nom_usina,
                ROUND(AVG(CASE WHEN COALESCE(flg_dadoventoinvalido, 0) = 0 THEN val_ventoverificado ELSE NULL END), 2) AS wind_speed_measured,
                ROUND(AVG(val_ventoverificado), 2) AS wind_speed_raw,
                ROUND(SUM(CASE WHEN flg_dadoventoinvalido = 1.0 THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 2) AS invalid_flag_pct,
                SUM(CASE WHEN flg_dadoventoinvalido = 1.0 THEN 1 ELSE 0 END) AS invalid_flag_count,
                ROUND(AVG(val_geracaoverificada), 2) AS generation_measured_mw,
                COUNT(*) AS sample_count
            FROM read_parquet('{files_pattern}')
            WHERE (
                UPPER(nom_conjuntousina) = UPPER(?) 
                OR nom_conjuntousina ILIKE ? 
                OR nom_conjuntousina ILIKE ?
            )
            GROUP BY 1
        )
        SELECT * FROM raw_hourly_plant
        UNION ALL
        SELECT * FROM raw_hourly_ensemble
        ORDER BY timestamp, nom_usina
    """

    try:
        tbl = con.execute(query, [clean_name, f"%{clean_name}%", like_pattern, clean_name, f"%{clean_name}%", like_pattern]).to_arrow_table()
        con.close()
        if tbl.num_rows == 0:
            logger.info(f"Nenhum registro de vento medido encontrado no ONS EOL Detailed para '{clean_name}'.")
            return None

        df = pl.from_arrow(tbl).sort(["timestamp", "nom_usina"])
        df.write_parquet(cache_path)
        logger.info(
            f"Série medida ONS (por usina e média) salva em cache para {clean_name} ({len(df)} registros, {cache_path.stat().st_size / 1024:.1f} KB)"
        )
        return df
    except Exception as e:
        logger.error(f"Erro ao consultar ONS EOL Detailed para '{clean_name}': {e}")
        con.close()
        return None


def get_ensemble_plants(ensemble_name: str, id_ons: str | None = None) -> list[str]:
    """Retorna lista de usinas presentes no conjunto eólico (ex: ['Média do Conjunto', 'Caetité 1', 'Caetité 2', ...])."""
    df = fetch_ensemble_measured_series(ensemble_name, id_ons)
    if df is None or len(df) == 0:
        return ["Média do Conjunto"]

    plants = df["nom_usina"].unique().to_list()
    # Garante 'Média do Conjunto' em primeiro lugar
    if "Média do Conjunto" in plants:
        plants.remove("Média do Conjunto")
        plants.sort()
        return ["Média do Conjunto"] + plants
    plants.sort()
    return plants


def get_aggregated_measured_series(
    df: pl.DataFrame | None,
    start_month: str | None = None,
    end_month: str | None = None,
    aggregation: str = "daily",
    plant_name: str | None = None,
) -> dict[str, Any]:
    """Agrega a série horária de vento medido ONS em resolução diária, mensal ou horária.

    Retorna tanto a série da usina/média selecionada com flag de vento inválido
    quanto a desagregação das usinas individuais para plotagem multi-linhas.
    """
    if df is None or len(df) == 0:
        return {"series": [], "plants": []}

    target_plant = plant_name or "Média do Conjunto"
    all_plants = [p for p in df["nom_usina"].unique().to_list() if p != "Média do Conjunto"]
    all_plants.sort()

    filtered_df = df
    if start_month:
        try:
            start_ts = pl.lit(f"{start_month}-01 00:00:00").str.to_datetime("%Y-%m-%d %H:%M:%S")
            filtered_df = filtered_df.filter(pl.col("timestamp") >= start_ts)
        except Exception:
            pass

    if end_month:
        try:
            y, m = map(int, end_month.split("-"))
            next_m = m + 1 if m < 12 else 1
            next_y = y if m < 12 else y + 1
            end_ts = pl.lit(f"{next_y:04d}-{next_m:02d}-01 00:00:00").str.to_datetime("%Y-%m-%d %H:%M:%S")
            filtered_df = filtered_df.filter(pl.col("timestamp") < end_ts)
        except Exception:
            pass

    if len(filtered_df) == 0:
        return {"series": [], "plants": all_plants}

    # Prepara agrupamento temporal
    if aggregation == "monthly":
        time_col = pl.col("timestamp").dt.strftime("%Y-%m").alias("time_key")
    elif aggregation == "weekly":
        time_col = pl.col("timestamp").dt.truncate("1w").dt.strftime("%Y-%m-%d").alias("time_key")
    elif aggregation == "daily":
        time_col = pl.col("timestamp").dt.strftime("%Y-%m-%d").alias("time_key")
    else:
        time_col = pl.col("timestamp").dt.strftime("%Y-%m-%d %H:%M").alias("time_key")

    with_time = filtered_df.with_columns(time_col)

    # 1. Agregação da série principal selecionada (padrão: Média do Conjunto)
    main_df = with_time.filter(pl.col("nom_usina") == target_plant)
    if len(main_df) == 0:
        main_df = with_time.filter(pl.col("nom_usina") == "Média do Conjunto")

    main_agg = (
        main_df.group_by("time_key")
        .agg(
            [
                pl.col("wind_speed_measured").mean().round(2).alias("speed_measured"),
                pl.col("generation_measured_mw").mean().round(2).alias("generation_mw"),
                pl.col("invalid_flag_pct").mean().round(2).alias("invalid_flag_pct"),
                pl.col("invalid_flag_count").sum().alias("invalid_flag_count"),
            ]
        )
        .sort("time_key")
    )

    # 2. Agregação das usinas individuais para decomposição
    plants_df = with_time.filter(pl.col("nom_usina") != "Média do Conjunto")
    plants_map: dict[str, dict[str, float | None]] = {}
    if len(plants_df) > 0:
        plant_agg = (
            plants_df.group_by(["time_key", "nom_usina"])
            .agg(pl.col("wind_speed_measured").mean().round(2).alias("speed"))
            .sort(["time_key", "nom_usina"])
        )
        for r in plant_agg.iter_rows(named=True):
            t_key = r["time_key"]
            if t_key not in plants_map:
                plants_map[t_key] = {}
            plants_map[t_key][r["nom_usina"]] = r["speed"]

    series_result = []
    for r in main_agg.iter_rows(named=True):
        t_key = r["time_key"]
        series_result.append(
            {
                "time": t_key,
                "speed_measured": r["speed_measured"],
                "generation_mw": r["generation_mw"],
                "invalid_flag_pct": r["invalid_flag_pct"],
                "invalid_flag_count": r["invalid_flag_count"],
                "plant_speeds": plants_map.get(t_key, {}),
            }
        )

    return {
        "target_plant": target_plant,
        "available_plants": ["Média do Conjunto"] + all_plants,
        "series": series_result,
    }
