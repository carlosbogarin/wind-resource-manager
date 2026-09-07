from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field


class CompanySummaryResponse(BaseModel):
    company_name: str = Field(..., description="Nome da empresa operadora")
    total_ensembles: int = Field(..., description="Total de conjuntos eólicos")
    total_mw: float = Field(..., description="Capacidade total instalada em MW")
    states: list[str] = Field(default_factory=list, description="Estados com presença")


class EnsembleResponse(BaseModel):
    ensemble_name: str = Field(..., description="Nome do conjunto eólico")
    id_ons: str = Field(..., description="Identificador ONS do conjunto")
    subsystem: str = Field(..., description="Sigla do subsistema elétrico")
    subsystem_name: str = Field(..., description="Nome do subsistema")
    state: str = Field(..., description="Sigla da Unidade Federativa")
    state_name: str = Field(..., description="Nome do estado")
    connection_point: str = Field(..., description="Ponto de conexão na Rede Básica")
    latitude: float = Field(..., description="Latitude da SE Coletora")
    longitude: float = Field(..., description="Longitude da SE Coletora")
    capacity_mw: float = Field(..., description="Capacidade instalada em MW")
    plant_count: int = Field(..., description="Quantidade de usinas integrantes")
    plants: str = Field(..., description="Nomes das usinas")


class EnsembleDetailResponse(EnsembleResponse):
    company_name: str = Field(..., description="Nome da empresa operadora")
    fc_history: list[dict[str, Any]] = Field(
        default_factory=list, description="Histórico de fator de capacidade mensal ONS"
    )
