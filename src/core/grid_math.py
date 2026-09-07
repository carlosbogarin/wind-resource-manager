from __future__ import annotations

import math
from dataclasses import dataclass
from typing import Literal


@dataclass
class ReanalysisNode:
    """Representa um nó da grade de reanálise circundante a uma coordenada."""

    model: Literal["ERA5", "MERRA-2"]
    position: Literal["NW", "NE", "SW", "SE"]
    latitude: float
    longitude: float
    distance_km: float
    bearing_deg: float
    cardinal_direction: str
    weight: float = 0.0


EARTH_RADIUS_KM = 6371.0088


def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calcula a distância geodésica entre dois pontos pela fórmula de Haversine (km)."""
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = math.sin(delta_phi / 2.0) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0) ** 2
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return round(EARTH_RADIUS_KM * c, 3)


def calculate_bearing(lat1: float, lon1: float, lat2: float, lon2: float) -> tuple[float, str]:
    """Calcula o azimute (bearing de 0 a 360 graus) e a direção cardeal da SE até o nó."""
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_lambda = math.radians(lon2 - lon1)

    y = math.sin(delta_lambda) * math.cos(phi2)
    x = math.cos(phi1) * math.sin(phi2) - math.sin(phi1) * math.cos(phi2) * math.cos(delta_lambda)
    theta = math.atan2(y, x)
    bearing = (math.degrees(theta) + 360.0) % 360.0

    cardinals = [
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
        "N",
    ]
    idx = round(bearing / 22.5) % 16
    return round(bearing, 1), cardinals[idx]


def calculate_idw_weights(distances: list[float], power: float = 2.0) -> list[float]:
    """Calcula pesos de interpolação por Inverso da Distância Ponderada (IDW)."""
    for i, d in enumerate(distances):
        if d < 1e-4:
            weights = [0.0] * len(distances)
            weights[i] = 1.0
            return weights

    inv_d = [1.0 / (d**power) for d in distances]
    total = sum(inv_d)
    return [round(w / total, 4) for w in inv_d]


def get_era5_bounding_nodes(center_lat: float, center_lon: float) -> list[ReanalysisNode]:
    """Calcula os 4 nós mais próximos da grade ERA5 (resolução 0.25 graus x 0.25 graus).

    A grade ERA5 regular varia de -90 a +90 em lat e -180 a +180 em lon com passo 0.25°.
    """
    step = 0.25

    lat_south = math.floor(center_lat / step) * step
    lat_north = lat_south + step
    lon_west = math.floor(center_lon / step) * step
    lon_east = lon_west + step

    # Arredondamento para evitar imprecisões de ponto flutuante
    lat_south = round(lat_south, 4)
    lat_north = round(lat_north, 4)
    lon_west = round(lon_west, 4)
    lon_east = round(lon_east, 4)

    raw_nodes = [
        ("NW", lat_north, lon_west),
        ("NE", lat_north, lon_east),
        ("SW", lat_south, lon_west),
        ("SE", lat_south, lon_east),
    ]

    distances = [haversine_distance(center_lat, center_lon, lat, lon) for _, lat, lon in raw_nodes]
    weights = calculate_idw_weights(distances)

    nodes = []
    for (pos, lat, lon), dist, weight in zip(raw_nodes, distances, weights):
        deg, card = calculate_bearing(center_lat, center_lon, lat, lon)
        nodes.append(
            ReanalysisNode(
                model="ERA5",
                position=pos,
                latitude=lat,
                longitude=lon,
                distance_km=dist,
                bearing_deg=deg,
                cardinal_direction=card,
                weight=weight,
            )
        )
    return nodes


def get_merra2_bounding_nodes(center_lat: float, center_lon: float) -> list[ReanalysisNode]:
    """Calcula os 4 nós mais próximos da grade MERRA-2 (resolução 0.5 graus lat x 0.625 graus lon).

    A grade MERRA-2 regular tem centros em latitudes de -90 a +90 com passo 0.5°,
    e longitudes de -180 com passo 0.625°.
    """
    lat_step = 0.5
    lon_step = 0.625
    lon_origin = -180.0

    lat_south = math.floor(center_lat / lat_step) * lat_step
    lat_north = lat_south + lat_step

    lon_idx = math.floor((center_lon - lon_origin) / lon_step)
    lon_west = lon_origin + lon_idx * lon_step
    lon_east = lon_west + lon_step

    lat_south = round(lat_south, 4)
    lat_north = round(lat_north, 4)
    lon_west = round(lon_west, 5)
    lon_east = round(lon_east, 5)

    raw_nodes = [
        ("NW", lat_north, lon_west),
        ("NE", lat_north, lon_east),
        ("SW", lat_south, lon_west),
        ("SE", lat_south, lon_east),
    ]

    distances = [haversine_distance(center_lat, center_lon, lat, lon) for _, lat, lon in raw_nodes]
    weights = calculate_idw_weights(distances)

    nodes = []
    for (pos, lat, lon), dist, weight in zip(raw_nodes, distances, weights):
        deg, card = calculate_bearing(center_lat, center_lon, lat, lon)
        nodes.append(
            ReanalysisNode(
                model="MERRA-2",
                position=pos,
                latitude=lat,
                longitude=lon,
                distance_km=dist,
                bearing_deg=deg,
                cardinal_direction=card,
                weight=weight,
            )
        )
    return nodes
