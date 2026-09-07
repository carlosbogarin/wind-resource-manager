from __future__ import annotations

import logging

import polars as pl
from fastapi import APIRouter, HTTPException, Query

from src.analytics.correlation import compute_reanalysis_measured_correlation
from src.analytics.profiles import compute_diurnal_profile, compute_monthly_seasonality, correlate_with_ons_fc
from src.analytics.spatial_interpolation import (
    interpolate_reanalysis_to_point,
    load_vortex_series,
)
from src.analytics.weibull import fit_weibull
from src.analytics.wind_rose import calculate_wind_rose
from src.api.schemas.reanalysis import (
    AnalyticsResponse,
    DateRangeResponse,
    DownloadRequest,
    DownloadResponse,
    InterpolationRequest,
    InterpolationResponse,
    NodeModel,
    NodesResponse,
    SubstationGeo,
)
from src.core.config import settings
from src.core.grid_math import get_era5_bounding_nodes, get_merra2_bounding_nodes
from src.etl.date_range_checker import filter_df_by_period, get_synchronized_30y_date_range
from src.etl.era5_client import fetch_and_cache_era5, get_era5_cache_path, load_era5_series
from src.etl.merra2_client import fetch_and_cache_merra2, get_merra2_cache_path, load_merra2_series
from src.etl.ons_catalog import get_ensemble_details
from src.etl.ons_eol_detail import (
    fetch_ensemble_measured_series,
    get_aggregated_measured_series,
    get_ensemble_plants,
)

logger = logging.getLogger("api.reanalysis")
router = APIRouter(prefix="/reanalysis", tags=["Reanálise ERA5 & MERRA-2"])


def _build_nodes_for_coords(lat: float, lon: float) -> tuple[list[NodeModel], list[NodeModel]]:
    """Calcula nós de grade ERA5 e MERRA-2 e seus estados de cache para coordenadas geográficas."""
    era5_math_nodes = get_era5_bounding_nodes(lat, lon)
    era5_models = []
    for n in era5_math_nodes:
        node_id = f"ERA5-{n.position}"
        era5_pattern = f"era5_*_{n.latitude:.4f}_{n.longitude:.4f}_*.parquet"
        cached = (
            get_era5_cache_path(node_id, n.latitude, n.longitude, 1996, 2026).exists()
            or get_era5_cache_path(node_id, n.latitude, n.longitude, 1994, 2024).exists()
            or len(list(settings.REANALYSIS_DIR.glob(era5_pattern))) > 0
        )
        era5_models.append(
            NodeModel(
                node_id=node_id,
                model="ERA5",
                position=n.position,
                latitude=n.latitude,
                longitude=n.longitude,
                distance_km=n.distance_km,
                bearing_deg=n.bearing_deg,
                cardinal_direction=n.cardinal_direction,
                weight=n.weight,
                is_cached=cached,
            )
        )

    merra2_math_nodes = get_merra2_bounding_nodes(lat, lon)
    merra2_models = []
    for n in merra2_math_nodes:
        node_id = f"MERRA2-{n.position}"
        merra2_pattern = f"merra2_*_{n.latitude:.4f}_{n.longitude:.4f}_*.parquet"
        cached = (
            get_merra2_cache_path(node_id, n.latitude, n.longitude, 1996, 2026).exists()
            or get_merra2_cache_path(node_id, n.latitude, n.longitude, 1994, 2024).exists()
            or len(list(settings.REANALYSIS_DIR.glob(merra2_pattern))) > 0
        )
        merra2_models.append(
            NodeModel(
                node_id=node_id,
                model="MERRA-2",
                position=n.position,
                latitude=n.latitude,
                longitude=n.longitude,
                distance_km=n.distance_km,
                bearing_deg=n.bearing_deg,
                cardinal_direction=n.cardinal_direction,
                weight=n.weight,
                is_cached=cached,
            )
        )

    return era5_models, merra2_models


@router.get("/date-range", response_model=DateRangeResponse)
def get_reanalysis_date_range(force: bool = False):
    """Retorna o intervalo sincronizado de 30 anos baseado no modelo mais desatualizado entre ERA5 e MERRA-2."""
    data = get_synchronized_30y_date_range(force_refresh=force)
    return DateRangeResponse(**data)


@router.get("/nodes", response_model=NodesResponse)
def get_nodes_for_ensemble(id_ons: str = Query(..., description="ID do conjunto eólico ONS")):
    """Calcula a SE Coletora e os 4 nós mais próximos de ERA5 (0.25°) e MERRA-2 (0.5°x0.625°)."""
    det = get_ensemble_details(id_ons)
    if not det:
        raise HTTPException(status_code=404, detail=f"Conjunto eólico '{id_ons}' não encontrado.")

    lat = det["latitude"]
    lon = det["longitude"]
    era5_models, merra2_models = _build_nodes_for_coords(lat, lon)

    return NodesResponse(
        substation=SubstationGeo(
            id_ons=det["id_ons"],
            ensemble_name=det["ensemble_name"],
            latitude=lat,
            longitude=lon,
            state=det["state"],
            capacity_mw=det["capacity_mw"],
        ),
        era5_nodes=era5_models,
        merra2_nodes=merra2_models,
    )


@router.get("/nodes-by-coords", response_model=NodesResponse)
def get_nodes_for_coordinates(
    latitude: float = Query(..., description="Latitude do ponto alvo"),
    longitude: float = Query(..., description="Longitude do ponto alvo"),
    site_name: str = Query(default="Ponto Personalizado", description="Nome descritivo do local"),
):
    """Calcula o ponto alvo e os 4 nós mais próximos de ERA5 (0.25°) e MERRA-2 (0.5°x0.625°) para quaisquer coordenadas geográficas."""
    era5_models, merra2_models = _build_nodes_for_coords(latitude, longitude)

    return NodesResponse(
        substation=SubstationGeo(
            id_ons="MANUAL",
            ensemble_name=site_name,
            latitude=latitude,
            longitude=longitude,
            state="",
            capacity_mw=0.0,
        ),
        era5_nodes=era5_models,
        merra2_nodes=merra2_models,
    )


@router.post("/interpolate", response_model=InterpolationResponse)
def trigger_spatial_interpolation(req: InterpolationRequest):
    """Executa a interpolação espacial vetorial horizontal dos 4 nós (ERA5 ou MERRA-2) até as coordenadas do ponto alvo."""
    try:
        result = interpolate_reanalysis_to_point(
            model=req.model,
            lat=req.latitude,
            lon=req.longitude,
            site_name=req.site_name,
            start_year=req.start_year,
            end_year=req.end_year,
            force=req.force,
        )
        return InterpolationResponse(**result)
    except Exception as e:
        logger.error(f"Erro na interpolação espacial ({req.model}): {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/download", response_model=DownloadResponse)
def trigger_download(req: DownloadRequest):
    """Baixa ou carrega do cache a série temporal histórica para o nó ou modelo selecionado."""
    try:
        if req.model == "ERA5":
            cache_file = get_era5_cache_path(req.node_id, req.latitude, req.longitude, req.start_year, req.end_year)
            is_cached = cache_file.exists() and not req.force
            path = fetch_and_cache_era5(
                node_id=req.node_id,
                lat=req.latitude,
                lon=req.longitude,
                start_year=req.start_year,
                end_year=req.end_year,
                force=req.force,
            )
        else:
            cache_file = get_merra2_cache_path(req.node_id, req.latitude, req.longitude, req.start_year, req.end_year)
            is_cached = cache_file.exists() and not req.force
            path = fetch_and_cache_merra2(
                node_id=req.node_id,
                lat=req.latitude,
                lon=req.longitude,
                start_year=req.start_year,
                end_year=req.end_year,
                force=req.force,
            )

        df = pl.read_parquet(path)
        size_mb = round(path.stat().st_size / (1024 * 1024), 2)
        records = len(df)

        return DownloadResponse(
            status="success",
            node_id=req.node_id,
            model=req.model,
            records_count=records,
            file_size_mb=size_mb,
            cached=is_cached,
            message=f"Série {req.model} obtida com sucesso: {records} horas ({size_mb} MB)",
        )
    except Exception as e:
        logger.error(f"Erro no download da série {req.model}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/plants")
def get_plants_for_ensemble(
    ensemble_name: str = Query(..., description="Nome do conjunto eólico ONS"),
    id_ons: str | None = Query(default=None),
):
    """Retorna a lista de usinas individuais que compõem o conjunto eólico (dataset ONS EOL Detailed)."""
    try:
        plants = get_ensemble_plants(ensemble_name, id_ons=id_ons)
        return {
            "ensemble_name": ensemble_name,
            "id_ons": id_ons,
            "plants": plants,
        }
    except Exception as e:
        logger.error(f"Erro ao listar usinas do conjunto '{ensemble_name}': {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/timeseries")
def get_timeseries_data(
    node_id: str = Query(...),
    model: str = Query(...),
    latitude: float = Query(...),
    longitude: float = Query(...),
    ensemble_name: str | None = Query(default=None, description="Nome do conjunto eólico para agregar vento medido ONS"),
    plant_name: str | None = Query(default=None, description="Nome da usina individual ou 'Média do Conjunto'"),
    start_year: int = Query(default=1994),
    end_year: int = Query(default=2024),
    start_month: str | None = Query(default=None, description="Formato AAAA-MM"),
    end_month: str | None = Query(default=None, description="Formato AAAA-MM"),
    aggregation: str = Query(default="daily", pattern="^(hourly|daily|monthly)$"),
):
    """Retorna a série temporal horária, diária ou mensal formatada para o Apache ECharts, incluindo vento medido dos parques e flag de dado inválido."""
    try:
        if node_id.startswith("VORTEX"):
            df = load_vortex_series(model, latitude, longitude, start_year, end_year)
        elif model == "ERA5":
            df = load_era5_series(node_id, latitude, longitude, start_year, end_year)
        else:
            df = load_merra2_series(node_id, latitude, longitude, start_year, end_year)

        if df is None or len(df) == 0:
            return {
                "node_id": node_id,
                "model": model,
                "aggregation": aggregation,
                "total_points": 0,
                "series": [],
            }

        # Filtrar por janela ano-mês se fornecida
        df = filter_df_by_period(df, start_month, end_month)

        if aggregation == "hourly":
            if len(df) > 100000:
                aggregation = "daily"

        # Carregar dados medidos concomitantes do conjunto se especificado
        measured_map: dict[str, float | None] = {}
        gen_map: dict[str, float | None] = {}
        invalid_map: dict[str, float | None] = {}
        plant_speeds_map: dict[str, dict[str, float | None]] = {}
        available_plants: list[str] = []

        if ensemble_name:
            try:
                m_df = fetch_ensemble_measured_series(ensemble_name)
                if m_df is not None and len(m_df) > 0:
                    m_res = get_aggregated_measured_series(
                        m_df,
                        start_month=start_month,
                        end_month=end_month,
                        aggregation=aggregation,
                        plant_name=plant_name,
                    )
                    available_plants = m_res.get("available_plants", [])
                    for item in m_res.get("series", []):
                        t = item["time"]
                        measured_map[t] = item.get("speed_measured")
                        gen_map[t] = item.get("generation_mw")
                        invalid_map[t] = item.get("invalid_flag_pct", 0.0)
                        plant_speeds_map[t] = item.get("plant_speeds", {})
            except Exception as ex:
                logger.warning(f"Não foi possível carregar vento medido ONS para '{ensemble_name}': {ex}")

        if aggregation == "daily":
            agg_df = (
                df.with_columns(pl.col("timestamp").dt.date().alias("date"))
                .group_by("date")
                .agg(
                    [
                        pl.col("wind_speed_100m").mean().round(2).alias("wind_speed_100m"),
                        pl.col("wind_speed_10m").mean().round(2).alias("wind_speed_10m"),
                        pl.col("wind_speed_100m").max().round(2).alias("wind_speed_100m_max"),
                        pl.col("temperature_2m_c").mean().round(1).alias("temperature"),
                    ]
                )
                .sort("date")
            )
            data = []
            for row in agg_df.iter_rows(named=True):
                time_str = row["date"].strftime("%Y-%m-%d")
                data.append(
                    {
                        "time": time_str,
                        "speed_100m": row["wind_speed_100m"],
                        "speed_10m": row["wind_speed_10m"],
                        "speed_max": row["wind_speed_100m_max"],
                        "temp": row["temperature"],
                        "speed_measured": measured_map.get(time_str),
                        "generation_mw": gen_map.get(time_str),
                        "invalid_wind_pct": invalid_map.get(time_str, 0.0),
                        "plant_speeds": plant_speeds_map.get(time_str, {}),
                    }
                )
        elif aggregation == "monthly":
            agg_df = (
                df.with_columns(pl.col("timestamp").dt.strftime("%Y-%m").alias("mes_ano"))
                .group_by("mes_ano")
                .agg(
                    [
                        pl.col("wind_speed_100m").mean().round(2).alias("wind_speed_100m"),
                        pl.col("wind_speed_10m").mean().round(2).alias("wind_speed_10m"),
                        pl.col("wind_speed_100m").max().round(2).alias("wind_speed_100m_max"),
                        pl.col("temperature_2m_c").mean().round(1).alias("temperature"),
                    ]
                )
                .sort("mes_ano")
            )
            data = []
            for row in agg_df.iter_rows(named=True):
                time_str = row["mes_ano"]
                data.append(
                    {
                        "time": time_str,
                        "speed_100m": row["wind_speed_100m"],
                        "speed_10m": row["wind_speed_10m"],
                        "speed_max": row["wind_speed_100m_max"],
                        "temp": row["temperature"],
                        "speed_measured": measured_map.get(time_str),
                        "generation_mw": gen_map.get(time_str),
                        "invalid_wind_pct": invalid_map.get(time_str, 0.0),
                        "plant_speeds": plant_speeds_map.get(time_str, {}),
                    }
                )
        else:
            # Horário (amostrado se muito grande)
            sample_df = df.slice(0, 8760)
            data = []
            for row in sample_df.iter_rows(named=True):
                time_str = row["timestamp"].strftime("%Y-%m-%d %H:%M")
                data.append(
                    {
                        "time": time_str,
                        "speed_100m": row["wind_speed_100m"],
                        "speed_10m": row["wind_speed_10m"],
                        "direction_100m": row["wind_direction_100m"],
                        "temp": row["temperature_2m_c"],
                        "speed_measured": measured_map.get(time_str),
                        "generation_mw": gen_map.get(time_str),
                        "invalid_wind_pct": invalid_map.get(time_str, 0.0),
                        "plant_speeds": plant_speeds_map.get(time_str, {}),
                    }
                )

        return {
            "node_id": node_id,
            "model": model,
            "aggregation": aggregation,
            "has_measured_data": len(measured_map) > 0,
            "selected_plant": plant_name or "Média do Conjunto",
            "available_plants": available_plants,
            "total_points": len(data),
            "series": data,
        }
    except Exception as e:
        logger.error(f"Erro ao carregar série temporal: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/ons-measured")
def get_ons_measured_series(
    ensemble_name: str = Query(..., description="Nome do conjunto eólico ONS"),
    id_ons: str | None = Query(default=None),
    plant_name: str | None = Query(default=None, description="Nome da usina ou Média do Conjunto"),
    start_month: str | None = Query(default=None),
    end_month: str | None = Query(default=None),
    aggregation: str = Query(default="daily", pattern="^(hourly|daily|monthly)$"),
):
    """Retorna série temporal histórica de velocidade do vento medida pelos anemômetros dos parques eólicos (dataset ONS EOL Detailed)."""
    try:
        df = fetch_ensemble_measured_series(ensemble_name, id_ons=id_ons)
        if df is None or len(df) == 0:
            return {
                "ensemble_name": ensemble_name,
                "id_ons": id_ons,
                "total_points": 0,
                "aggregation": aggregation,
                "available_plants": ["Média do Conjunto"],
                "series": [],
            }
        res = get_aggregated_measured_series(
            df,
            start_month=start_month,
            end_month=end_month,
            aggregation=aggregation,
            plant_name=plant_name,
        )
        return {
            "ensemble_name": ensemble_name,
            "id_ons": id_ons,
            "target_plant": res.get("target_plant", "Média do Conjunto"),
            "available_plants": res.get("available_plants", []),
            "total_points": len(res.get("series", [])),
            "aggregation": aggregation,
            "series": res.get("series", []),
        }
    except Exception as e:
        logger.error(f"Erro ao consultar vento medido ONS para '{ensemble_name}': {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/correlation")
def get_correlation_data(
    node_id: str = Query(...),
    model: str = Query(...),
    latitude: float = Query(...),
    longitude: float = Query(...),
    ensemble_name: str = Query(...),
    id_ons: str | None = Query(default=None),
    plant_name: str | None = Query(default=None, description="Nome da usina individual ou 'Média do Conjunto'"),
    start_year: int = Query(default=1996),
    end_year: int = Query(default=2026),
    start_month: str | None = Query(default=None),
    end_month: str | None = Query(default=None),
    aggregation: str = Query(default="hourly", pattern="^(hourly|daily|weekly|monthly)$"),
):
    """Calcula regressão linear concomitante (Measure-Correlate-Predict / MCP) entre reanálise e dados reais medidos das turbinas."""
    try:
        if node_id.startswith("VORTEX"):
            r_df = load_vortex_series(model, latitude, longitude, start_year, end_year)
        elif model == "ERA5":
            r_df = load_era5_series(node_id, latitude, longitude, start_year, end_year)
        else:
            r_df = load_merra2_series(node_id, latitude, longitude, start_year, end_year)

        if r_df is None or len(r_df) == 0:
            return None

        m_df = fetch_ensemble_measured_series(ensemble_name, id_ons=id_ons)
        if m_df is None or len(m_df) == 0:
            return None

        if start_month or end_month:
            r_df = filter_df_by_period(r_df, start_month, end_month)

        corr_res = compute_reanalysis_measured_correlation(
            reanalysis_df=r_df,
            measured_df=m_df,
            aggregation=aggregation,
            plant_name=plant_name,
        )
        if corr_res is None:
            return None

        corr_res["node_id"] = node_id
        corr_res["model"] = model
        corr_res["ensemble_name"] = ensemble_name
        return corr_res
    except Exception as e:
        logger.error(f"Erro ao calcular correlação concomitante: {e}")
        raise HTTPException(status_code=500, detail=str(e))



@router.get("/analytics", response_model=AnalyticsResponse)
def get_analytics(
    node_id: str = Query(...),
    model: str = Query(...),
    latitude: float = Query(...),
    longitude: float = Query(...),
    id_ons: str = Query(default=""),
    start_year: int = Query(default=1994),
    end_year: int = Query(default=2024),
    start_month: str | None = Query(default=None, description="Formato AAAA-MM"),
    end_month: str | None = Query(default=None, description="Formato AAAA-MM"),
):
    """Calcula estatísticas de Weibull, Rosa dos Ventos, Perfil Diurno e correlação com FC do ONS."""
    try:
        if node_id.startswith("VORTEX"):
            df = load_vortex_series(model, latitude, longitude, start_year, end_year)
        elif model == "ERA5":
            df = load_era5_series(node_id, latitude, longitude, start_year, end_year)
        else:
            df = load_merra2_series(node_id, latitude, longitude, start_year, end_year)

        if df is None or len(df) == 0:
            return AnalyticsResponse(
                node_id=node_id,
                model=model,
                total_hours=0,
                period_start=f"{start_year}-01",
                period_end=f"{end_year}-12",
                weibull={
                    "k_shape": 0.0,
                    "c_scale": 0.0,
                    "mean_speed": 0.0,
                    "std_speed": 0.0,
                    "histogram": [],
                    "weibull_curve": [],
                },
                wind_rose={
                    "sectors": [],
                    "speed_bins": [],
                    "series": [],
                    "dominant_sector": "N",
                    "dominant_frequency_pct": 0.0,
                    "calm_percentage": 0.0,
                },
                diurnal_profile=[],
                monthly_seasonality=[],
                ons_correlation=[],
            )

        # Filtrar por janela ano-mês se fornecida
        df = filter_df_by_period(df, start_month, end_month)

        if node_id.startswith("VORTEX") or model == "ERA5":
            speeds = df["wind_speed_100m"].to_numpy()
            directions = df["wind_direction_100m"].to_numpy()
        else:
            speeds = df["wind_speed_100m"].to_numpy()
            directions = df["wind_direction_50m"].to_numpy()

        # Ajuste de Weibull
        weibull_stats = fit_weibull(speeds)

        # Rosa dos Ventos
        rose_stats = calculate_wind_rose(speeds, directions)

        # Perfil Diurno e Sazonalidade
        diurnal = compute_diurnal_profile(df)
        seasonality = compute_monthly_seasonality(df)

        # Correlação com ONS se id_ons fornecido
        ons_corr = []
        if id_ons:
            det = get_ensemble_details(id_ons)
            if det and det.get("fc_history"):
                ons_corr = correlate_with_ons_fc(df, det["fc_history"])

        min_ts = df["timestamp"].min()
        max_ts = df["timestamp"].max()

        return AnalyticsResponse(
            node_id=node_id,
            model=model,
            total_hours=len(df),
            period_start=min_ts.strftime("%Y-%m-%d") if min_ts else str(start_year),
            period_end=max_ts.strftime("%Y-%m-%d") if max_ts else str(end_year),
            weibull=weibull_stats,
            wind_rose=rose_stats,
            diurnal_profile=diurnal,
            monthly_seasonality=seasonality,
            ons_correlation=ons_corr,
        )
    except Exception as e:
        logger.error(f"Erro ao calcular estatísticas analíticas: {e}")
        raise HTTPException(status_code=500, detail=str(e))
