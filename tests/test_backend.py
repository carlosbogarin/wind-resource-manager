from __future__ import annotations

from fastapi.testclient import TestClient

from src.analytics.weibull import fit_weibull
from src.analytics.wind_rose import calculate_wind_rose
from src.api.main import app
from src.core.grid_math import (
    calculate_bearing,
    calculate_idw_weights,
    get_era5_bounding_nodes,
    get_merra2_bounding_nodes,
    haversine_distance,
)
from src.etl.ons_catalog import build_wind_catalog, list_companies, list_ensembles_by_company


def test_haversine_distance():
    # Distancia conhecida entre dois pontos
    d = haversine_distance(-14.10, -42.60, -14.10, -42.60)
    assert d == 0.0

    d2 = haversine_distance(-14.0, -42.5, -14.25, -42.75)
    assert 30.0 < d2 < 50.0


def test_bearing_calculation():
    deg, card = calculate_bearing(0.0, 0.0, 1.0, 0.0)
    assert deg == 0.0
    assert card == "N"

    deg, card = calculate_bearing(0.0, 0.0, 0.0, 1.0)
    assert deg == 90.0
    assert card == "E"


def test_idw_weights():
    weights = calculate_idw_weights([10.0, 10.0, 10.0, 10.0])
    assert len(weights) == 4
    assert all(abs(w - 0.25) < 1e-3 for w in weights)


def test_era5_nodes_surrounding():
    # Coordenadas da Bahia (ex: Caetité)
    lat = -14.1028
    lon = -42.6094
    nodes = get_era5_bounding_nodes(lat, lon)
    assert len(nodes) == 4
    positions = [n.position for n in nodes]
    assert set(positions) == {"NW", "NE", "SW", "SE"}
    for n in nodes:
        assert n.distance_km > 0.0
        assert n.model == "ERA5"


def test_merra2_nodes_surrounding():
    lat = -14.1028
    lon = -42.6094
    nodes = get_merra2_bounding_nodes(lat, lon)
    assert len(nodes) == 4
    positions = [n.position for n in nodes]
    assert set(positions) == {"NW", "NE", "SW", "SE"}
    for n in nodes:
        assert n.distance_km > 0.0
        assert n.model == "MERRA-2"


def test_weibull_and_wind_rose():
    sample_speeds = [
        6.5,
        7.2,
        8.1,
        5.4,
        9.0,
        10.5,
        7.8,
        6.9,
        8.4,
        7.5,
        6.8,
        9.2,
        11.0,
        8.5,
        7.1,
        6.4,
        5.9,
        8.8,
        7.7,
        9.5,
    ]
    sample_dirs = [
        45.0,
        50.0,
        55.0,
        40.0,
        60.0,
        90.0,
        85.0,
        75.0,
        45.0,
        50.0,
        55.0,
        65.0,
        70.0,
        80.0,
        90.0,
        45.0,
        50.0,
        55.0,
        60.0,
        70.0,
    ]

    weibull = fit_weibull(sample_speeds)
    assert "k_shape" in weibull
    assert "c_scale" in weibull
    assert weibull["k_shape"] > 0
    assert weibull["c_scale"] > 0

    rose = calculate_wind_rose(sample_speeds, sample_dirs)
    assert len(rose["sectors"]) == 16
    assert len(rose["series"]) == 6
    assert rose["dominant_sector"] in ["NE", "ENE", "E"]


def test_catalog_and_api():
    cat_path = build_wind_catalog()
    assert cat_path.exists()

    companies = list_companies()
    assert len(companies) > 0
    first_company = companies[0]["company_name"]

    ensembles = list_ensembles_by_company(first_company)
    assert len(ensembles) > 0
    assert "id_ons" in ensembles[0]
    assert "latitude" in ensembles[0]
    assert "longitude" in ensembles[0]

    client = TestClient(app)
    r = client.get("/api/health")
    assert r.status_code == 200
    assert r.json()["status"] == "healthy"

    r_comp = client.get("/api/catalog/companies")
    assert r_comp.status_code == 200
    assert len(r_comp.json()) > 0

    test_id_ons = ensembles[0]["id_ons"]
    r_nodes = client.get(f"/api/reanalysis/nodes?id_ons={test_id_ons}")
    assert r_nodes.status_code == 200
    data = r_nodes.json()
    assert len(data["era5_nodes"]) == 4
    assert len(data["merra2_nodes"]) == 4
