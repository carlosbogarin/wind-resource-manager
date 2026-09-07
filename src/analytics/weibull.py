from __future__ import annotations

from typing import Any

import numpy as np
from scipy import stats


def fit_weibull(wind_speeds: list[float] | np.ndarray) -> dict[str, Any]:
    """Ajusta a distribuição de probabilidade de Weibull bi-paramétrica aos dados de velocidade do vento.

    Retorna os parâmetros de forma (k), escala (c), média, desvio e dados para plotagem.
    """
    arr = np.array(wind_speeds, dtype=float)
    arr = arr[np.isfinite(arr)]
    arr = arr[arr >= 0.1]  # Remover velocidades nulas ou espúrias

    if len(arr) < 20:
        return {
            "k_shape": 2.0,
            "c_scale": 7.0,
            "mean_speed": round(float(np.mean(arr)) if len(arr) > 0 else 7.0, 2),
            "std_speed": 2.0,
            "histogram": [],
            "weibull_curve": [],
        }

    # Ajuste por Máxima Verossimilhança via scipy.stats.weibull_min
    # floc=0 fixa a localização na origem
    shape_k, loc, scale_c = stats.weibull_min.fit(arr, floc=0)

    mean_v = float(np.mean(arr))
    std_v = float(np.std(arr))

    # Histograma de frequências observadas (passo de 1 m/s)
    max_v = min(30.0, max(20.0, float(np.percentile(arr, 99.5))))
    bins = np.arange(0.0, max_v + 1.0, 1.0)
    hist, bin_edges = np.histogram(arr, bins=bins, density=True)

    histogram_data = []
    for i in range(len(hist)):
        bin_center = round((bin_edges[i] + bin_edges[i + 1]) / 2.0, 1)
        histogram_data.append(
            {
                "speed_bin": f"{bin_edges[i]:.0f}-{bin_edges[i + 1]:.0f}",
                "speed_center": bin_center,
                "frequency_pct": round(float(hist[i]) * 100.0, 3),
            }
        )

    # Curva teórica contínua de Weibull
    curve_v = np.linspace(0.1, max_v, 100)
    pdf = (shape_k / scale_c) * ((curve_v / scale_c) ** (shape_k - 1.0)) * np.exp(-((curve_v / scale_c) ** shape_k))

    weibull_curve = [
        {"speed": round(float(v), 2), "probability_pct": round(float(p) * 100.0, 3)} for v, p in zip(curve_v, pdf)
    ]

    return {
        "k_shape": round(float(shape_k), 3),
        "c_scale": round(float(scale_c), 3),
        "mean_speed": round(mean_v, 2),
        "std_speed": round(std_v, 2),
        "histogram": histogram_data,
        "weibull_curve": weibull_curve,
    }
