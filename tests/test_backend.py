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
    # Verifica ordenacao alfabetica estrita das empresas
    comp_names = [c["company_name"].upper() for c in companies]
    assert comp_names == sorted(comp_names)
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
    api_comps = [c["company_name"].upper() for c in r_comp.json()]
    assert api_comps == sorted(api_comps)

    test_id_ons = ensembles[0]["id_ons"]
    r_nodes = client.get(f"/api/reanalysis/nodes?id_ons={test_id_ons}")
    assert r_nodes.status_code == 200
    data = r_nodes.json()
    assert len(data["era5_nodes"]) == 4
    assert len(data["merra2_nodes"]) == 4


def test_dynamic_date_range():
    import polars as pl

    from src.etl.date_range_checker import filter_df_by_period, get_synchronized_30y_date_range

    date_range = get_synchronized_30y_date_range(force_refresh=True)
    assert "start_year" in date_range
    assert "end_year" in date_range
    assert "start_year_month" in date_range
    assert "end_year_month" in date_range
    assert len(date_range["start_year_month"]) == 7  # YYYY-MM
    assert len(date_range["end_year_month"]) == 7  # YYYY-MM
    assert date_range["end_year"] - date_range["start_year"] == 30
    assert date_range["limiting_model"] in ["ERA5", "MERRA-2"]

    client = TestClient(app)
    r = client.get("/api/reanalysis/date-range")
    assert r.status_code == 200
    data = r.json()
    assert data["total_years"] == 30
    assert data["start_year"] == date_range["start_year"]
    assert data["end_year"] == date_range["end_year"]
    assert data["start_year_month"] == date_range["start_year_month"]
    assert data["end_year_month"] == date_range["end_year_month"]
    assert "limiting_model" in data
    assert "explanation" in data

    # Testar filter_df_by_period
    sample_df = pl.DataFrame(
        {
            "timestamp": pl.datetime_range(
                start=pl.datetime(1996, 1, 1),
                end=pl.datetime(2026, 12, 31),
                interval="1mo",
                eager=True,
            ),
            "wind_speed_100m": [8.0] * 372,
        }
    )
    filtered = filter_df_by_period(sample_df, "1996-08", "2026-08")
    assert len(filtered) == 361  # De agosto de 1996 até agosto de 2026 inclusive


def test_uncached_node_endpoints():
    client = TestClient(app)
    r_ts = client.get("/api/reanalysis/timeseries?node_id=ERA5-TEST-UNCACHED&model=ERA5&latitude=-14.0&longitude=-42.0")
    assert r_ts.status_code == 200
    data_ts = r_ts.json()
    assert data_ts["total_points"] == 0
    assert data_ts["series"] == []

    r_an = client.get("/api/reanalysis/analytics?node_id=ERA5-TEST-UNCACHED&model=ERA5&latitude=-14.0&longitude=-42.0")
    assert r_an.status_code == 200
    data_an = r_an.json()
    assert data_an["total_hours"] == 0

    r_corr = client.get("/api/reanalysis/correlation?node_id=ERA5-TEST-UNCACHED&model=ERA5&latitude=-14.0&longitude=-42.0&ensemble_name=TESTE")
    assert r_corr.status_code == 200
    assert r_corr.json() is None


def test_linear_correlation_computation():
    from datetime import datetime, timedelta

    import polars as pl

    from src.analytics.correlation import compute_reanalysis_measured_correlation

    dates = [datetime(2024, 1, 1) + timedelta(hours=i) for i in range(100)]
    r_speeds = [5.0 + 0.1 * i for i in range(100)]
    m_speeds = [1.2 * s + 0.5 for s in r_speeds]

    r_df = pl.DataFrame({"timestamp": dates, "wind_speed_100m": r_speeds})
    m_df = pl.DataFrame({"timestamp": dates, "wind_speed_measured": m_speeds})

    res = compute_reanalysis_measured_correlation(r_df, m_df, aggregation="hourly")
    assert res is not None
    assert res["n_samples"] == 100
    assert abs(res["pearson_r"] - 1.0) < 1e-4
    assert abs(res["r_squared"] - 1.0) < 1e-4
    assert abs(res["slope"] - 1.2) < 1e-2
    assert abs(res["intercept"] - 0.5) < 1e-2
    # Teste semanal e mensal
    dates_long = [datetime(2023, 1, 1) + timedelta(days=i) for i in range(200)]
    r_speeds_long = [6.0 + 0.05 * i for i in range(200)]
    m_speeds_long = [1.1 * s + 0.8 for s in r_speeds_long]
    r_df_long = pl.DataFrame({"timestamp": dates_long, "wind_speed_100m": r_speeds_long})
    m_df_long = pl.DataFrame({"timestamp": dates_long, "wind_speed_measured": m_speeds_long})

    res_weekly = compute_reanalysis_measured_correlation(r_df_long, m_df_long, aggregation="weekly")
    assert res_weekly is not None
    assert res_weekly["n_samples"] >= 25
    assert abs(res_weekly["pearson_r"] - 1.0) < 1e-4

    res_monthly = compute_reanalysis_measured_correlation(r_df_long, m_df_long, aggregation="monthly")
    assert res_monthly is not None
    assert res_monthly["n_samples"] >= 6
    assert abs(res_monthly["pearson_r"] - 1.0) < 1e-4


def test_reanalysis_catalog():
    from datetime import datetime

    from src.database.reanalysis_catalog import get_node_record, upsert_node_record

    min_ts = datetime(1996, 1, 1, 0, 0)
    max_ts = datetime(2026, 8, 31, 23, 0)

    upsert_node_record(
        model="ERA5",
        node_id="TEST-NODE-1",
        lat=-14.25,
        lon=-42.50,
        min_timestamp=min_ts,
        max_timestamp=max_ts,
        total_records=268800,
        file_path="data/reanalysis/test.parquet",
        file_size_mb=4.5,
    )

    rec = get_node_record("ERA5", -14.25, -42.50)
    assert rec is not None
    assert rec["node_id"] == "TEST-NODE-1"
    assert rec["total_records"] == 268800
    assert rec["max_timestamp"] == max_ts


def test_multi_plant_correlation():
    from datetime import datetime, timedelta

    import polars as pl

    from src.analytics.correlation import compute_reanalysis_measured_correlation

    dates = [datetime(2024, 1, 1) + timedelta(hours=i) for i in range(50)]
    r_speeds = [6.0 + 0.05 * i for i in range(50)]

    r_df = pl.DataFrame({"timestamp": dates, "wind_speed_100m": r_speeds})

    # DataFrame com duas usinas e a média
    m_records = []
    for i, d in enumerate(dates):
        m_records.append({"timestamp": d, "nom_usina": "Usina Alpha", "wind_speed_measured": 7.0 + 0.05 * i})
        m_records.append({"timestamp": d, "nom_usina": "Usina Beta", "wind_speed_measured": 5.0 + 0.05 * i})
        m_records.append({"timestamp": d, "nom_usina": "Média do Conjunto", "wind_speed_measured": 6.0 + 0.05 * i})

    m_df = pl.DataFrame(m_records)

    res_alpha = compute_reanalysis_measured_correlation(r_df, m_df, aggregation="hourly", plant_name="Usina Alpha")
    assert res_alpha is not None
    assert res_alpha["plant_name"] == "Usina Alpha"
    assert "Usina Beta" in res_alpha["available_plants"]
    assert "Média do Conjunto" in res_alpha["available_plants"]
    assert abs(res_alpha["pearson_r"] - 1.0) < 1e-4

    res_beta = compute_reanalysis_measured_correlation(r_df, m_df, aggregation="hourly", plant_name="Usina Beta")
    assert res_beta is not None
    assert res_beta["plant_name"] == "Usina Beta"
    assert abs(res_beta["pearson_r"] - 1.0) < 1e-4


def test_nodes_by_coordinates_api():
    client = TestClient(app)
    resp = client.get("/api/reanalysis/nodes-by-coords", params={
        "latitude": -14.1028,
        "longitude": -42.6094,
        "site_name": "Mastro Teste 01",
    })
    assert resp.status_code == 200
    data = resp.json()
    assert data["substation"]["id_ons"] == "MANUAL"
    assert data["substation"]["ensemble_name"] == "Mastro Teste 01"
    assert len(data["era5_nodes"]) == 4
    assert len(data["merra2_nodes"]) == 4
    assert {n["position"] for n in data["era5_nodes"]} == {"NW", "NE", "SW", "SE"}
    assert {n["position"] for n in data["merra2_nodes"]} == {"NW", "NE", "SW", "SE"}


def test_vortex_spatial_vector_math():
    import numpy as np

    from src.analytics.spatial_interpolation import get_vortex_cache_path

    # Test pure trigonometric vector reconstitution
    # Case: uniform 10 m/s from 90 degrees (East) on all 4 nodes with equal weights
    ws = np.array([10.0, 10.0])
    wd = np.array([90.0, 90.0])
    rad = np.pi / 180.0
    u = -ws * np.sin(wd * rad) # -10.0
    v = -ws * np.cos(wd * rad) # 0.0

    # IDW weighted sum with equal weights
    u_syn = 0.25 * u * 4
    v_syn = 0.25 * v * 4

    rec_ws = np.round(np.sqrt(u_syn**2 + v_syn**2), 2)
    rec_wd = np.round((np.degrees(np.arctan2(-u_syn, -v_syn)) + 360.0) % 360.0, 1)

    assert abs(rec_ws[0] - 10.0) < 1e-2
    assert abs(rec_wd[0] - 90.0) < 1e-1

    # Verify cache path naming
    p = get_vortex_cache_path("ERA5", -14.1028, -42.6094, 1996, 2026)
    assert "vortex_era5_-14.1028_-42.6094_1996_2026.parquet" in str(p)


def test_persistent_node_catalog_and_cross_project_cache():
    """Testa sincronização DuckDB e reutilização de nós entre diferentes projetos e módulos."""
    from src.database.reanalysis_catalog import (
        is_node_cached_in_db,
        list_all_downloaded_nodes,
        sync_reanalysis_disk_to_duckdb,
    )

    # 1. Sincroniza disco com DuckDB
    synced = sync_reanalysis_disk_to_duckdb()
    assert synced >= 0

    # 2. Catálogo deve listar nós persistidos
    nodes = list_all_downloaded_nodes()
    assert isinstance(nodes, list)

    # 3. Endpoint /api/reanalysis/catalog
    client = TestClient(app)
    resp = client.get("/api/reanalysis/catalog")
    assert resp.status_code == 200
    catalog_list = resp.json()
    assert isinstance(catalog_list, list)

    # 4. Checagem de nós conhecidos em cache
    for node in catalog_list:
        assert is_node_cached_in_db(node["model"], node["latitude"], node["longitude"]) is True








