from __future__ import annotations

import logging
import math
from typing import Any

import numpy as np
import polars as pl
from scipy import stats

logger = logging.getLogger("analytics.correlation")


def compute_reanalysis_measured_correlation(
    reanalysis_df: pl.DataFrame | None,
    measured_df: pl.DataFrame | None,
    aggregation: str = "hourly",
    plant_name: str | None = None,
    max_scatter_points: int = 4000,
    algorithm: str = "LLS",
) -> dict[str, Any] | None:
    """Calcula a correlação linear concomitante (Measure-Correlate-Predict / MCP)
    via Linear Least Squares (LLS) ou Total Least Squares (TLS / Regressão Ortogonal)
    entre a velocidade de vento da reanálise (x) e o vento medido pelas usinas (y).
    """
    if reanalysis_df is None or measured_df is None:
        return None
    if len(reanalysis_df) == 0 or len(measured_df) == 0:
        return None

    # Decomposição de usinas disponíveis
    available_plants: list[str] = ["Média do Conjunto"]
    active_m_df = measured_df
    target_plant = plant_name or "Média do Conjunto"

    if "nom_usina" in measured_df.columns:
        p_list = [p for p in measured_df["nom_usina"].unique().to_list() if p != "Média do Conjunto"]
        available_plants = ["Média do Conjunto"] + sorted(p_list)
        if target_plant in available_plants:
            active_m_df = measured_df.filter(pl.col("nom_usina") == target_plant)
        else:
            active_m_df = measured_df.filter(pl.col("nom_usina") == "Média do Conjunto")

    if len(active_m_df) == 0:
        active_m_df = measured_df

    # Normalizar timestamps para pareamento concomitante
    if aggregation == "monthly":
        r_clean = (
            reanalysis_df.with_columns(pl.col("timestamp").dt.strftime("%Y-%m").alias("time_key"))
            .group_by("time_key")
            .agg(pl.col("wind_speed_100m").mean().alias("wind_reanalysis"))
        )
        m_clean = (
            active_m_df.with_columns(pl.col("timestamp").dt.strftime("%Y-%m").alias("time_key"))
            .group_by("time_key")
            .agg(pl.col("wind_speed_measured").mean().alias("wind_measured"))
        )
    elif aggregation == "weekly":
        r_clean = (
            reanalysis_df.with_columns(
                pl.col("timestamp").dt.truncate("1w").dt.strftime("%Y-%m-%d").alias("time_key")
            )
            .group_by("time_key")
            .agg(pl.col("wind_speed_100m").mean().alias("wind_reanalysis"))
        )
        m_clean = (
            active_m_df.with_columns(
                pl.col("timestamp").dt.truncate("1w").dt.strftime("%Y-%m-%d").alias("time_key")
            )
            .group_by("time_key")
            .agg(pl.col("wind_speed_measured").mean().alias("wind_measured"))
        )
    elif aggregation == "daily":
        r_clean = (
            reanalysis_df.with_columns(pl.col("timestamp").dt.strftime("%Y-%m-%d").alias("time_key"))
            .group_by("time_key")
            .agg(pl.col("wind_speed_100m").mean().alias("wind_reanalysis"))
        )
        m_clean = (
            active_m_df.with_columns(pl.col("timestamp").dt.strftime("%Y-%m-%d").alias("time_key"))
            .group_by("time_key")
            .agg(pl.col("wind_speed_measured").mean().alias("wind_measured"))
        )
    else:
        # Horário
        r_clean = reanalysis_df.with_columns(
            pl.col("timestamp").dt.strftime("%Y-%m-%d %H:%M").alias("time_key")
        ).select(["time_key", pl.col("wind_speed_100m").alias("wind_reanalysis")])
        m_clean = active_m_df.with_columns(
            pl.col("timestamp").dt.strftime("%Y-%m-%d %H:%M").alias("time_key")
        ).select(["time_key", pl.col("wind_speed_measured").alias("wind_measured")])

    # Inner join para garantir exata concomitância temporal
    paired = r_clean.join(m_clean, on="time_key", how="inner").filter(
        (pl.col("wind_reanalysis") > 0.0)
        & (pl.col("wind_measured") > 0.0)
        & pl.col("wind_reanalysis").is_not_null()
        & pl.col("wind_measured").is_not_null()
    )

    n_samples = len(paired)
    min_required = 5 if aggregation == "monthly" else (10 if aggregation == "weekly" else 20)
    if n_samples < min_required:
        logger.warning(
            f"Poucos pontos concomitantes para correlação linear ({n_samples} amostras, mínimo {min_required})."
        )
        return None

    x = paired["wind_reanalysis"].to_numpy().astype(np.float64)
    y = paired["wind_measured"].to_numpy().astype(np.float64)

    # Coeficiente de correlação de Pearson (propriedade invariante da distribuição bivariada)
    reg = stats.linregress(x, y)
    r_val = float(reg.rvalue)
    r_squared = float(r_val**2)

    x_mean = float(np.mean(x))
    x_std = float(np.std(x))
    y_mean = float(np.mean(y))
    y_std = float(np.std(y))

    # Ajuste de inclinação e intercepto conforme o algoritmo escolhido (LLS ou TLS)
    algo_upper = algorithm.upper()
    if algo_upper == "TLS":
        # Total Least Squares (Regressão Ortogonal / Deming com delta=1)
        # Minimiza a soma dos quadrados das distâncias perpendiculares euclidianas até a reta:
        s_xx = float(np.var(x, ddof=1))
        s_yy = float(np.var(y, ddof=1))
        s_xy = float(np.cov(x, y)[0, 1])
        if abs(s_xy) < 1e-9:
            slope = 1.0
        else:
            slope = float(((s_yy - s_xx) + np.sqrt((s_yy - s_xx)**2 + 4.0 * (s_xy**2))) / (2.0 * s_xy))
        intercept = float(y_mean - slope * x_mean)
        algo_code = "TLS"
        algo_name = "Total Least Squares (Mínimos Quadrados Totais / Ortogonal)"
        algo_desc = "Minimiza a distância ortogonal perpendicular dos pontos até a reta de ajuste (Deming / Gauss-Markov bi-variado)."
    else:
        # Linear Least Squares (Mínimos Quadrados Lineares Ordinários)
        slope = float(reg.slope)
        intercept = float(reg.intercept)
        algo_code = "LLS"
        algo_name = "Linear Least Squares (Mínimos Quadrados Lineares)"
        algo_desc = "Ajuste clássico por mínimos quadrados ordinários minimizando a soma dos resíduos verticais da medição em relação à referência."

    # Resíduos e métricas em relação ao modelo ajustado (y_pred = slope * x + intercept)
    y_pred = slope * x + intercept
    diff = y - y_pred
    bias = float(np.mean(diff))
    rmse = float(np.sqrt(np.mean(diff**2)))
    mae = float(np.mean(np.abs(diff)))

    x_min = float(np.min(x))
    x_max = float(np.max(x))
    y_max = float(np.max(y))

    # Pontos da reta de regressão ajustada
    fit_line = [
        {"x": round(x_min, 2), "y": round(slope * x_min + intercept, 2)},
        {"x": round(x_max, 2), "y": round(slope * x_max + intercept, 2)},
    ]

    # Pontos da linha 1:1 de referência (ideal sem viés)
    max_axis = math.ceil(max(x_max, y_max))
    ideal_line = [
        {"x": 0.0, "y": 0.0},
        {"x": max_axis, "y": max_axis},
    ]

    # Amostragem de pontos de dispersão (scatter plot)
    if n_samples > max_scatter_points:
        step = n_samples // max_scatter_points
        sampled_paired = paired[::step]
    else:
        sampled_paired = paired

    scatter_points = [
        [
            round(float(r["wind_reanalysis"]), 2),
            round(float(r["wind_measured"]), 2),
            str(r["time_key"]),
        ]
        for r in sampled_paired.iter_rows(named=True)
    ]

    # Classificação qualitativa do R de Pearson
    abs_r = abs(r_val)
    if abs_r >= 0.85:
        r_quality = "Excelente correlação"
        r_color = "text-emerald-400"
    elif abs_r >= 0.70:
        r_quality = "Boa correlação"
        r_color = "text-cyan-400"
    elif abs_r >= 0.50:
        r_quality = "Correlação moderada"
        r_color = "text-amber-400"
    else:
        r_quality = "Correlação fraca"
        r_color = "text-rose-400"

    equation_str = f"Vmed = {slope:.3f} * Vrean + ({intercept:.3f})" if intercept >= 0 else f"Vmed = {slope:.3f} * Vrean - ({abs(intercept):.3f})"

    return {
        "algorithm": algo_code,
        "algorithm_name": algo_name,
        "algorithm_description": algo_desc,
        "n_samples": n_samples,
        "aggregation": aggregation,
        "plant_name": target_plant,
        "available_plants": available_plants,
        "pearson_r": round(r_val, 4),
        "r_squared": round(r_squared, 4),
        "slope": round(slope, 4),
        "intercept": round(intercept, 4),
        "equation": equation_str,
        "bias": round(bias, 3),
        "rmse": round(rmse, 3),
        "mae": round(mae, 3),
        "r_quality": r_quality,
        "r_color": r_color,
        "reanalysis_mean": round(x_mean, 2),
        "reanalysis_std": round(x_std, 2),
        "measured_mean": round(y_mean, 2),
        "measured_std": round(y_std, 2),
        "fit_line": fit_line,
        "ideal_line": ideal_line,
        "scatter_points": scatter_points,
    }
