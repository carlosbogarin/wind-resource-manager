from __future__ import annotations

from typing import Any

import polars as pl


def compute_diurnal_profile(df: pl.DataFrame) -> list[dict[str, Any]]:
    """Calcula o perfil diurno médio horário (00h a 23h) da velocidade do vento."""
    if "timestamp" not in df.columns or "wind_speed_100m" not in df.columns:
        return []

    res = (
        df.with_columns(pl.col("timestamp").dt.hour().alias("hour"))
        .group_by("hour")
        .agg(
            [
                pl.col("wind_speed_100m").mean().round(2).alias("mean_speed"),
                pl.col("wind_speed_100m").quantile(0.10).round(2).alias("p10_speed"),
                pl.col("wind_speed_100m").quantile(0.90).round(2).alias("p90_speed"),
                pl.col("wind_speed_100m").std().round(2).alias("std_speed"),
            ]
        )
        .sort("hour")
    )

    profile = []
    for row in res.iter_rows(named=True):
        profile.append(
            {
                "hour": int(row["hour"]),
                "hour_label": f"{int(row['hour']):02d}:00",
                "mean_speed": float(row["mean_speed"] or 0.0),
                "p10_speed": float(row["p10_speed"] or 0.0),
                "p90_speed": float(row["p90_speed"] or 0.0),
                "std_speed": float(row["std_speed"] or 0.0),
            }
        )
    return profile


def compute_monthly_seasonality(df: pl.DataFrame) -> list[dict[str, Any]]:
    """Calcula o perfil de sazonalidade mensal (Janeiro a Dezembro) da velocidade do vento."""
    if "timestamp" not in df.columns or "wind_speed_100m" not in df.columns:
        return []

    months_pt = [
        "Jan",
        "Fev",
        "Mar",
        "Abr",
        "Mai",
        "Jun",
        "Jul",
        "Ago",
        "Set",
        "Out",
        "Nov",
        "Dez",
    ]

    res = (
        df.with_columns(pl.col("timestamp").dt.month().alias("month"))
        .group_by("month")
        .agg(
            [
                pl.col("wind_speed_100m").mean().round(2).alias("mean_speed"),
                pl.col("wind_speed_100m").min().round(2).alias("min_speed"),
                pl.col("wind_speed_100m").max().round(2).alias("max_speed"),
                pl.col("wind_speed_100m").std().round(2).alias("std_speed"),
            ]
        )
        .sort("month")
    )

    seasonality = []
    for row in res.iter_rows(named=True):
        m_idx = int(row["month"]) - 1
        seasonality.append(
            {
                "month": int(row["month"]),
                "month_name": months_pt[m_idx] if 0 <= m_idx < 12 else str(row["month"]),
                "mean_speed": float(row["mean_speed"] or 0.0),
                "min_speed": float(row["min_speed"] or 0.0),
                "max_speed": float(row["max_speed"] or 0.0),
                "std_speed": float(row["std_speed"] or 0.0),
            }
        )
    return seasonality


def correlate_with_ons_fc(
    reanalysis_df: pl.DataFrame,
    ons_fc_history: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    """Correlaciona a velocidade média mensal de reanálise com o Fator de Capacidade real do ONS."""
    if not ons_fc_history or "timestamp" not in reanalysis_df.columns:
        return []

    # Agregar reanálise por ano-mês
    monthly_wind = (
        reanalysis_df.with_columns(pl.col("timestamp").dt.strftime("%Y-%m").alias("mes_ano"))
        .group_by("mes_ano")
        .agg(pl.col("wind_speed_100m").mean().round(2).alias("reanalysis_wind_speed"))
        .sort("mes_ano")
    )

    wind_dict = {row["mes_ano"]: row["reanalysis_wind_speed"] for row in monthly_wind.iter_rows(named=True)}

    comparison = []
    for item in ons_fc_history:
        mes_ano = item.get("mes_ano", "")
        fc = item.get("fc", 0.0)
        cap = item.get("cap_mw", 0.0)
        re_wind = wind_dict.get(mes_ano)

        comparison.append(
            {
                "mes_ano": mes_ano,
                "ons_fc_pct": round(float(fc) * 100.0 if fc <= 1.0 else float(fc), 2),
                "capacity_mw": cap,
                "reanalysis_wind_speed": re_wind,
            }
        )

    return comparison
