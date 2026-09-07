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
    max_scatter_points: int = 4000,
) -> dict[str, Any] | None:
    """Calcula a correlação linear concomitante (Measure-Correlate-Predict / MCP)
    entre a velocidade de vento da reanálise (x) e o vento medido pelas usinas (y).
    """
    if reanalysis_df is None or measured_df is None:
        return None
    if len(reanalysis_df) == 0 or len(measured_df) == 0:
        return None

    # Normalizar timestamps para pareamento concomitante
    if aggregation == "daily":
        r_clean = (
            reanalysis_df.with_columns(pl.col("timestamp").dt.date().alias("time_key"))
            .group_by("time_key")
            .agg(pl.col("wind_speed_100m").mean().alias("wind_reanalysis"))
        )
        m_clean = (
            measured_df.with_columns(pl.col("timestamp").dt.date().alias("time_key"))
            .group_by("time_key")
            .agg(pl.col("wind_speed_measured").mean().alias("wind_measured"))
        )
    else:
        # Horário
        r_clean = reanalysis_df.with_columns(
            pl.col("timestamp").dt.truncate("1h").alias("time_key")
        ).select(["time_key", pl.col("wind_speed_100m").alias("wind_reanalysis")])
        m_clean = measured_df.with_columns(
            pl.col("timestamp").dt.truncate("1h").alias("time_key")
        ).select(["time_key", pl.col("wind_speed_measured").alias("wind_measured")])

    # Inner join para garantir exata concomitância temporal
    paired = r_clean.join(m_clean, on="time_key", how="inner").filter(
        (pl.col("wind_reanalysis") > 0.0)
        & (pl.col("wind_measured") > 0.0)
        & pl.col("wind_reanalysis").is_not_null()
        & pl.col("wind_measured").is_not_null()
    )

    n_samples = len(paired)
    if n_samples < 20:
        logger.warning(f"Poucos pontos concomitantes para correlação linear ({n_samples} amostras).")
        return None

    x = paired["wind_reanalysis"].to_numpy().astype(np.float64)
    y = paired["wind_measured"].to_numpy().astype(np.float64)

    # Regressão linear (y = a * x + b)
    reg = stats.linregress(x, y)
    r_val = float(reg.rvalue)
    r_squared = float(r_val**2)
    slope = float(reg.slope)
    intercept = float(reg.intercept)

    diff = y - x
    bias = float(np.mean(diff))
    rmse = float(np.sqrt(np.mean(diff**2)))
    mae = float(np.mean(np.abs(diff)))

    x_mean = float(np.mean(x))
    x_std = float(np.std(x))
    y_mean = float(np.mean(y))
    y_std = float(np.std(y))

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
        "n_samples": n_samples,
        "aggregation": aggregation,
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
