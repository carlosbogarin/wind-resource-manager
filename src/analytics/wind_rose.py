from __future__ import annotations

from typing import Any

import numpy as np

SECTORS_16 = [
    "N",
    "NNE",
    "NE",
    "ENE",
    "E",
    "ESE",
    "SE",
    "SSE",
    "S",
    "SSW",
    "SW",
    "WSW",
    "W",
    "WNW",
    "NW",
    "NNW",
]

SPEED_BINS = [
    {"label": "0 - 3 m/s", "min": 0.0, "max": 3.0, "color": "#38bdf8"},
    {"label": "3 - 6 m/s", "min": 3.0, "max": 6.0, "color": "#2dd4bf"},
    {"label": "6 - 9 m/s", "min": 6.0, "max": 9.0, "color": "#a3e635"},
    {"label": "9 - 12 m/s", "min": 9.0, "max": 12.0, "color": "#facc15"},
    {"label": "12 - 15 m/s", "min": 12.0, "max": 15.0, "color": "#fb923c"},
    {"label": "> 15 m/s", "min": 15.0, "max": 999.0, "color": "#f87171"},
]


def calculate_wind_rose(
    speeds: list[float] | np.ndarray,
    directions: list[float] | np.ndarray,
) -> dict[str, Any]:
    """Calcula a distribuição direcional da Rosa dos Ventos em 16 setores e faixas de velocidade."""
    s_arr = np.array(speeds, dtype=float)
    d_arr = np.array(directions, dtype=float)

    mask = np.isfinite(s_arr) & np.isfinite(d_arr) & (s_arr >= 0) & (d_arr >= 0)
    s_arr = s_arr[mask]
    d_arr = d_arr[mask]

    total_pts = len(s_arr)
    if total_pts == 0:
        return {
            "sectors": SECTORS_16,
            "speed_bins": [b["label"] for b in SPEED_BINS],
            "series": [{"name": b["label"], "data": [0.0] * 16} for b in SPEED_BINS],
            "dominant_sector": "E",
            "calm_percentage": 0.0,
        }

    # Calmaria (< 0.5 m/s)
    calm_count = np.sum(s_arr < 0.5)
    calm_pct = round(float(calm_count) / total_pts * 100.0, 2)

    # Atribuição de setores: cada setor abrange 22.5 graus.
    # N vai de 348.75 a 11.25, NNE de 11.25 a 33.75, etc.
    # (dir + 11.25) // 22.5 % 16 mapeia exatamente para 0..15
    sector_indices = np.floor(((d_arr + 11.25) % 360.0) / 22.5).astype(int)

    bin_series = []
    sector_totals = np.zeros(16)

    for b in SPEED_BINS:
        bin_counts = np.zeros(16)
        in_bin_mask = (s_arr >= b["min"]) & (s_arr < b["max"])
        for sec_idx in range(16):
            c = np.sum(in_bin_mask & (sector_indices == sec_idx))
            pct = round(float(c) / total_pts * 100.0, 2)
            bin_counts[sec_idx] = pct
            sector_totals[sec_idx] += pct

        bin_series.append(
            {
                "name": b["label"],
                "color": b["color"],
                "data": bin_counts.tolist(),
            }
        )

    dom_idx = int(np.argmax(sector_totals))
    dominant_sector = SECTORS_16[dom_idx]

    return {
        "sectors": SECTORS_16,
        "speed_bins": [b["label"] for b in SPEED_BINS],
        "series": bin_series,
        "dominant_sector": dominant_sector,
        "dominant_frequency_pct": round(float(sector_totals[dom_idx]), 2),
        "calm_percentage": calm_pct,
    }
