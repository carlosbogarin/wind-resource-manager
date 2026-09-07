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
