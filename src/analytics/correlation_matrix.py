from __future__ import annotations

import logging
from typing import Any

import numpy as np
import polars as pl
from scipy import stats

from src.analytics.spatial_interpolation import (
    find_existing_vortex_file,
    get_vortex_cache_path,
    load_vortex_series,
)
from src.core.grid_math import get_era5_bounding_nodes, get_merra2_bounding_nodes
from src.database.reanalysis_catalog import is_node_cached_in_db
from src.etl.date_range_checker import filter_df_by_period
from src.etl.era5_client import find_existing_era5_file, load_era5_series
from src.etl.merra2_client import find_existing_merra2_file, load_merra2_series
from src.etl.ons_eol_detail import fetch_ensemble_measured_series

logger = logging.getLogger("analytics.correlation_matrix")


def discover_cached_series_for_ensemble(
    latitude: float,
    longitude: float,
) -> list[dict[str, Any]]:
    """Descobre todas as séries de reanálise persistidas em cache local para as coordenadas dadas:
    - 4 nós de grade ERA5 (NW, NE, SW, SE)
    - 4 nós de grade MERRA-2 (NW, NE, SW, SE)
    - Ponto sintético extrapolado ao alvo ERA5 (VORTEX-ERA5)
    - Ponto sintético extrapolado ao alvo MERRA-2 (VORTEX-MERRA-2)
    """
    discovered: list[dict[str, Any]] = []

    # 1. Extrapolação Horizontal Alvo (VORTEX-ERA5)
    era5_vortex_path = find_existing_vortex_file("ERA5", latitude, longitude)
    if era5_vortex_path is not None or get_vortex_cache_path("ERA5", latitude, longitude).exists():
        discovered.append(
            {
                "series_id": "VORTEX-ERA5",
                "series_name": "Extrapolação Alvo (ERA5)",
                "model": "ERA5",
                "series_type": "synthetic",
                "position": "ALVO",
                "cardinal_direction": "Alvo",
                "distance_km": 0.0,
                "bearing_deg": 0.0,
                "latitude": latitude,
                "longitude": longitude,
                "weight": 1.0,
            }
        )

    # 2. Extrapolação Horizontal Alvo (VORTEX-MERRA-2)
    merra2_vortex_path = find_existing_vortex_file("MERRA-2", latitude, longitude)
    if merra2_vortex_path is not None or get_vortex_cache_path("MERRA-2", latitude, longitude).exists():
        discovered.append(
            {
                "series_id": "VORTEX-MERRA-2",
                "series_name": "Extrapolação Alvo (MERRA-2)",
                "model": "MERRA-2",
                "series_type": "synthetic",
                "position": "ALVO",
                "cardinal_direction": "Alvo",
                "distance_km": 0.0,
                "bearing_deg": 0.0,
                "latitude": latitude,
                "longitude": longitude,
                "weight": 1.0,
            }
        )

    # 3. Nós de Grade ERA5
    era5_nodes = get_era5_bounding_nodes(latitude, longitude)
    for n in era5_nodes:
        cached = (
            is_node_cached_in_db("ERA5", n.latitude, n.longitude)
            or find_existing_era5_file(n.latitude, n.longitude) is not None
        )
        if cached:
            discovered.append(
                {
                    "series_id": f"ERA5-{n.position}",
                    "series_name": f"ERA5 {n.position} ({n.cardinal_direction})",
                    "model": "ERA5",
                    "series_type": "node",
                    "position": n.position,
                    "cardinal_direction": n.cardinal_direction,
                    "distance_km": round(n.distance_km, 1),
                    "bearing_deg": round(n.bearing_deg, 1),
                    "latitude": n.latitude,
                    "longitude": n.longitude,
                    "weight": round(n.weight, 4),
                }
            )

    # 4. Nós de Grade MERRA-2
    merra2_nodes = get_merra2_bounding_nodes(latitude, longitude)
    for n in merra2_nodes:
        cached = (
            is_node_cached_in_db("MERRA-2", n.latitude, n.longitude)
            or find_existing_merra2_file(n.latitude, n.longitude) is not None
        )
        if cached:
            discovered.append(
                {
                    "series_id": f"MERRA2-{n.position}",
                    "series_name": f"MERRA-2 {n.position} ({n.cardinal_direction})",
                    "model": "MERRA-2",
                    "series_type": "node",
                    "position": n.position,
                    "cardinal_direction": n.cardinal_direction,
                    "distance_km": round(n.distance_km, 1),
                    "bearing_deg": round(n.bearing_deg, 1),
                    "latitude": n.latitude,
                    "longitude": n.longitude,
                    "weight": round(n.weight, 4),
                }
            )

    return discovered


def _prepare_time_key(df: pl.DataFrame, col_name: str, aggregation: str) -> pl.DataFrame:
    """Prepara série agregada para pareamento concomitante."""
    if aggregation == "monthly":
        return (
            df.with_columns(pl.col("timestamp").dt.strftime("%Y-%m").alias("time_key"))
            .group_by("time_key")
            .agg(pl.col(col_name).mean().alias("speed"))
        )
    elif aggregation == "weekly":
        return (
            df.with_columns(
                pl.col("timestamp").dt.truncate("1w").dt.strftime("%Y-%m-%d").alias("time_key")
            )
            .group_by("time_key")
            .agg(pl.col(col_name).mean().alias("speed"))
        )
    elif aggregation == "daily":
        return (
            df.with_columns(pl.col("timestamp").dt.strftime("%Y-%m-%d").alias("time_key"))
            .group_by("time_key")
            .agg(pl.col(col_name).mean().alias("speed"))
        )
    else:
        # Horário
        return df.with_columns(
            pl.col("timestamp").dt.strftime("%Y-%m-%d %H:%M").alias("time_key")
        ).select(["time_key", pl.col(col_name).alias("speed")])


def compute_ensemble_correlation_matrix(
    ensemble_name: str,
    latitude: float,
    longitude: float,
    id_ons: str | None = None,
    start_year: int = 1996,
    end_year: int = 2026,
    start_month: str | None = None,
    end_month: str | None = None,
    aggregation: str = "hourly",
    algorithm: str = "LLS",
) -> dict[str, Any]:
    """Calcula a matriz de correlação cruzada entre todas as séries de reanálise em cache e as usinas do conjunto ONS.
    
    Retorna:
    - Lista ordenada de usinas (Média do Conjunto + usinas individuais);
    - Linhas para cada série de reanálise com métricas (R, R², RMSE, Bias, Amostras);
    - Mapeamento das melhores séries para cada coluna/usina (best_per_plant);
    - Série campeã global com score consolidado.
    """
    # 1. Carrega dados de medição das usinas ONS
    m_df = fetch_ensemble_measured_series(ensemble_name, id_ons=id_ons)
    if m_df is None or len(m_df) == 0:
        return {
            "ensemble_name": ensemble_name,
            "id_ons": id_ons,
            "aggregation": aggregation,
            "has_data": False,
            "plants": [],
            "series": [],
            "best_per_plant": {},
            "global_champion": None,
            "message": "Nenhum dado anemométrico medido encontrado no cache do ONS para este conjunto.",
        }

    # 2. Descobre séries em cache
    cached_series_meta = discover_cached_series_for_ensemble(latitude, longitude)
    if not cached_series_meta:
        return {
            "ensemble_name": ensemble_name,
            "id_ons": id_ons,
            "aggregation": aggregation,
            "has_data": False,
            "plants": [],
            "series": [],
            "best_per_plant": {},
            "global_champion": None,
            "message": "Nenhuma série de reanálise persistida em cache encontrada para as coordenadas do conjunto.",
        }

    # 3. Lista de usinas disponíveis (Média do Conjunto sempre primeira)
    raw_plants = [p for p in m_df["nom_usina"].unique().to_list() if p != "Média do Conjunto"]
    plants = ["Média do Conjunto"] + sorted(raw_plants)
    individual_plants = sorted(raw_plants)

    # 4. Pré-processa séries medidas por usina para o nível de agregação desejado
    prepared_measured: dict[str, pl.DataFrame] = {}
    for p in plants:
        sub_df = m_df.filter(pl.col("nom_usina") == p)
        if len(sub_df) > 0:
            m_clean = _prepare_time_key(sub_df, "wind_speed_measured", aggregation)
            prepared_measured[p] = m_clean.filter(
                (pl.col("speed") > 0.0) & pl.col("speed").is_not_null()
            )

    # 5. Itera sobre cada série de reanálise e calcula correlação para cada usina
    series_rows: list[dict[str, Any]] = []

    for s_meta in cached_series_meta:
        s_id = s_meta["series_id"]
        model = s_meta["model"]
        stype = s_meta["series_type"]

        # Carrega reanálise
        try:
            if stype == "synthetic":
                r_df = load_vortex_series(model, latitude, longitude, start_year, end_year)
            elif model == "ERA5":
                r_df = load_era5_series(s_id, s_meta["latitude"], s_meta["longitude"], start_year, end_year)
            else:
                r_df = load_merra2_series(s_id, s_meta["latitude"], s_meta["longitude"], start_year, end_year)
        except Exception as err:
            logger.warning(f"Erro ao ler série {s_id}: {err}")
            continue

        if r_df is None or len(r_df) == 0:
            continue

        if start_month or end_month:
            r_df = filter_df_by_period(r_df, start_month, end_month)

        r_prepared = _prepare_time_key(r_df, "wind_speed_100m", aggregation).filter(
            (pl.col("speed") > 0.0) & pl.col("speed").is_not_null()
        )

        metrics_by_plant: dict[str, dict[str, Any]] = {}
        r_values_for_score: list[float] = []

        for p in plants:
            m_prepared = prepared_measured.get(p)
            if m_prepared is None or len(m_prepared) == 0:
                metrics_by_plant[p] = {
                    "plant_name": p,
                    "r": None,
                    "r_squared": None,
                    "rmse": None,
                    "bias": None,
                    "mae": None,
                    "n_samples": 0,
                    "is_best": False,
                }
                continue

            # Pareamento estrito
            paired = r_prepared.join(m_prepared, on="time_key", how="inner", suffix="_meas")
            n_samples = len(paired)
            min_required = 5 if aggregation == "monthly" else (10 if aggregation == "weekly" else 20)

            if n_samples < min_required:
                metrics_by_plant[p] = {
                    "plant_name": p,
                    "r": None,
                    "r_squared": None,
                    "rmse": None,
                    "bias": None,
                    "mae": None,
                    "n_samples": n_samples,
                    "is_best": False,
                }
                continue

            x = paired["speed"].to_numpy().astype(np.float64)
            y = paired["speed_meas"].to_numpy().astype(np.float64)

            try:
                reg = stats.linregress(x, y)
                r_val = float(reg.rvalue)
                r_sq = float(r_val**2)

                x_mean = float(np.mean(x))
                y_mean = float(np.mean(y))

                if algorithm.upper() == "TLS":
                    # Total Least Squares (Regressão Ortogonal / Deming)
                    s_xx = float(np.var(x, ddof=1))
                    s_yy = float(np.var(y, ddof=1))
                    s_xy = float(np.cov(x, y)[0, 1])
                    if abs(s_xy) < 1e-9:
                        slope = 1.0
                    else:
                        slope = float(((s_yy - s_xx) + np.sqrt((s_yy - s_xx)**2 + 4.0 * (s_xy**2))) / (2.0 * s_xy))
                    intercept = float(y_mean - slope * x_mean)
                else:
                    # Linear Least Squares (LLS)
                    slope = float(reg.slope)
                    intercept = float(reg.intercept)

                diff = y - (slope * x + intercept)
                rmse = float(np.sqrt(np.mean(diff**2)))
                bias = float(np.mean(diff))
                mae = float(np.mean(np.abs(diff)))

                metrics_by_plant[p] = {
                    "plant_name": p,
                    "r": round(r_val, 4),
                    "r_squared": round(r_sq, 4),
                    "slope": round(slope, 3),
                    "intercept": round(intercept, 3),
                    "rmse": round(rmse, 2),
                    "bias": round(bias, 2),
                    "mae": round(mae, 2),
                    "n_samples": n_samples,
                    "is_best": False,
                }
                # Usinas individuais ou todas contam para o score
                if p in individual_plants or len(individual_plants) == 0:
                    r_values_for_score.append(r_val)
            except Exception as e:
                logger.warning(f"Erro regressão para {s_id} vs {p}: {e}")
                metrics_by_plant[p] = {
                    "plant_name": p,
                    "r": None,
                    "r_squared": None,
                    "rmse": None,
                    "bias": None,
                    "mae": None,
                    "n_samples": n_samples,
                    "is_best": False,
                }

        # Score Global = Média do R nas usinas (ou no conjunto se só tiver conjunto)
        global_score = (
            round(float(np.mean(r_values_for_score)), 4) if r_values_for_score else None
        )

        series_row = {
            **s_meta,
            "is_cached": True,
            "global_score": global_score,
            "wins_count": 0,
            "metrics_by_plant": metrics_by_plant,
        }
        series_rows.append(series_row)

    if not series_rows:
        return {
            "ensemble_name": ensemble_name,
            "id_ons": id_ons,
            "aggregation": aggregation,
            "has_data": False,
            "plants": plants,
            "series": [],
            "best_per_plant": {},
            "global_champion": None,
            "message": "Não foi possível sincronizar amostras suficientes entre as séries de reanálise e os dados medidos.",
        }

    # 6. Identifica o melhor em cada coluna (usina)
    best_per_plant: dict[str, str] = {}
    for p in plants:
        best_id = None
        best_r = -999.0
        for s in series_rows:
            m = s["metrics_by_plant"].get(p)
            if m and m["r"] is not None and m["r"] > best_r:
                best_r = m["r"]
                best_id = s["series_id"]

        if best_id:
            best_per_plant[p] = best_id
            for s in series_rows:
                if s["series_id"] == best_id and p in s["metrics_by_plant"]:
                    s["metrics_by_plant"][p]["is_best"] = True

    # 7. Contabiliza vitórias nas usinas individuais para desempate
    for p in individual_plants if individual_plants else plants:
        best_id = best_per_plant.get(p)
        if best_id:
            for s in series_rows:
                if s["series_id"] == best_id:
                    s["wins_count"] += 1

    # 8. Ordena as séries pelo Score Global decrescente (e número de vitórias como critério de desempate)
    series_rows.sort(
        key=lambda s: (s["global_score"] if s["global_score"] is not None else -999.0, s["wins_count"]),
        reverse=True,
    )

    # 9. Identifica o Campeão Global
    champ = series_rows[0] if series_rows and series_rows[0]["global_score"] is not None else None
    global_champion = None
    if champ and champ["global_score"] is not None:
        ens_r = (
            champ["metrics_by_plant"].get("Média do Conjunto", {}).get("r")
            if "Média do Conjunto" in champ["metrics_by_plant"]
            else champ["global_score"]
        )
        global_champion = {
            "series_id": champ["series_id"],
            "series_name": champ["series_name"],
            "model": champ["model"],
            "series_type": champ["series_type"],
            "global_score": champ["global_score"],
            "ensemble_mean_r": ens_r if ens_r is not None else champ["global_score"],
            "wins_count": champ["wins_count"],
            "total_plants": len(individual_plants) if individual_plants else 1,
        }

    return {
        "ensemble_name": ensemble_name,
        "id_ons": id_ons,
        "aggregation": aggregation,
        "algorithm": algorithm.upper(),
        "algorithm_name": (
            "Total Least Squares (Mínimos Quadrados Totais / Ortogonal)"
            if algorithm.upper() == "TLS"
            else "Linear Least Squares (Mínimos Quadrados Lineares)"
        ),
        "has_data": True,
        "plants": plants,
        "series": series_rows,
        "best_per_plant": best_per_plant,
        "global_champion": global_champion,
        "message": f"{len(series_rows)} séries em cache correlacionadas com sucesso.",
    }
