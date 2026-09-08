from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field


class NodeModel(BaseModel):
    node_id: str = Field(..., description="Identificador único do nó (ex: ERA5-NW)")
    model: Literal["ERA5", "MERRA-2"] = Field(..., description="Modelo de reanálise")
    position: Literal["NW", "NE", "SW", "SE"] = Field(..., description="Posição relativa do quadrante")
    latitude: float = Field(..., description="Latitude do nó na grade regular")
    longitude: float = Field(..., description="Longitude do nó na grade regular")
    distance_km: float = Field(..., description="Distância geodésica em km até a SE Coletora")
    bearing_deg: float = Field(..., description="Azimute em graus (0 a 360)")
    cardinal_direction: str = Field(..., description="Direção cardeal (ex: N, NE, E)")
    weight: float = Field(..., description="Peso de interpolação por inverso da distância (IDW)")
    is_cached: bool = Field(default=False, description="Indica se os dados já foram baixados localmente")


class SubstationGeo(BaseModel):
    id_ons: str
    ensemble_name: str
    latitude: float
    longitude: float
    state: str
    capacity_mw: float


class NodesResponse(BaseModel):
    substation: SubstationGeo
    era5_nodes: list[NodeModel]
    merra2_nodes: list[NodeModel]


class DateRangeResponse(BaseModel):
    era5_latest_date: str
    merra2_latest_date: str
    common_end_date: str
    common_start_date: str
    start_year: int
    end_year: int
    start_year_month: str
    end_year_month: str
    total_years: int
    limiting_model: str
    explanation: str


class DownloadRequest(BaseModel):
    node_id: str = Field(..., description="ID do nó ou 'SE_INTERPOLATED'")
    model: Literal["ERA5", "MERRA-2"]
    latitude: float
    longitude: float
    start_year: int = Field(default=1994, ge=1980, le=2026)
    end_year: int = Field(default=2024, ge=1980, le=2026)
    start_month: str | None = Field(default=None, description="Mês inicial no formato AAAA-MM")
    end_month: str | None = Field(default=None, description="Mês final no formato AAAA-MM")
    force: bool = Field(default=False)



class DownloadResponse(BaseModel):
    status: str
    node_id: str
    model: str
    records_count: int
    file_size_mb: float
    cached: bool
    message: str


class AnalyticsResponse(BaseModel):
    node_id: str
    model: str
    total_hours: int
    period_start: str
    period_end: str
    weibull: dict[str, Any]
    wind_rose: dict[str, Any]
    diurnal_profile: list[dict[str, Any]]
    monthly_seasonality: list[dict[str, Any]]
    ons_correlation: list[dict[str, Any]] = Field(default_factory=list)


class InterpolationRequest(BaseModel):
    model: Literal["ERA5", "MERRA-2"] = Field(..., description="Modelo base para os 4 nós")
    latitude: float = Field(..., ge=-90.0, le=90.0, description="Latitude da coordenada alvo")
    longitude: float = Field(..., ge=-180.0, le=180.0, description="Longitude da coordenada alvo")
    site_name: str = Field(default="Ponto Alvo", description="Nome descritivo do ponto / mastro")
    start_year: int = Field(default=1996, ge=1980, le=2026)
    end_year: int = Field(default=2026, ge=1980, le=2026)
    force: bool = Field(default=False)


class InterpolationResponse(BaseModel):
    status: str
    model: str
    synthetic_node_id: str
    site_name: str
    latitude: float
    longitude: float
    records_count: int
    file_path: str
    file_size_mb: float
    cached: bool
    weights: dict[str, float]
    bounding_nodes: list[dict[str, Any]]
    message: str


class PlantCorrelationMetric(BaseModel):
    plant_name: str
    r: float | None = None
    r_squared: float | None = None
    rmse: float | None = None
    bias: float | None = None
    mae: float | None = None
    n_samples: int = 0
    is_best: bool = False


class SeriesCorrelationRow(BaseModel):
    series_id: str
    series_name: str
    model: str
    series_type: str
    position: str
    cardinal_direction: str
    distance_km: float
    bearing_deg: float
    latitude: float
    longitude: float
    weight: float
    is_cached: bool = True
    global_score: float | None = None
    wins_count: int = 0
    metrics_by_plant: dict[str, PlantCorrelationMetric] = Field(default_factory=dict)


class ChampionInfo(BaseModel):
    series_id: str
    series_name: str
    model: str
    series_type: str
    global_score: float
    ensemble_mean_r: float
    wins_count: int
    total_plants: int


class CorrelationMatrixResponse(BaseModel):
    ensemble_name: str
    id_ons: str | None = None
    aggregation: str
    has_data: bool
    plants: list[str] = Field(default_factory=list)
    series: list[SeriesCorrelationRow] = Field(default_factory=list)
    best_per_plant: dict[str, str] = Field(default_factory=dict)
    global_champion: ChampionInfo | None = None
    message: str | None = None

