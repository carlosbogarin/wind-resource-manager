from __future__ import annotations

import logging

from fastapi import APIRouter, HTTPException, Query

from src.api.schemas.catalog import CompanySummaryResponse, EnsembleDetailResponse, EnsembleResponse
from src.etl.ons_catalog import (
    build_wind_catalog,
    get_ensemble_details,
    list_companies,
    list_ensembles_by_company,
)

logger = logging.getLogger("api.catalog")
router = APIRouter(prefix="/catalog", tags=["Catálogo Eólico ONS"])


@router.get("/companies", response_model=list[CompanySummaryResponse])
def get_companies():
    """Retorna todas as empresas proprietárias e operadoras de parques eólicos no Brasil."""
    try:
        return list_companies()
    except Exception as e:
        logger.error(f"Erro ao listar empresas: {e}")
        raise HTTPException(status_code=500, detail=f"Erro ao consultar catálogo: {str(e)}")


@router.get("/ensembles", response_model=list[EnsembleResponse])
def get_ensembles(company: str = Query(..., description="Nome da empresa operadora")):
    """Retorna todos os conjuntos eólicos de uma determinada empresa."""
    try:
        ensembles = list_ensembles_by_company(company)
        if not ensembles:
            raise HTTPException(status_code=404, detail=f"Nenhum conjunto eólico encontrado para a empresa '{company}'")
        return ensembles
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao listar conjuntos da empresa {company}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/ensemble/{id_ons}", response_model=EnsembleDetailResponse)
def get_ensemble(id_ons: str):
    """Retorna dados detalhados, coordenadas da SE Coletora e histórico de FC do conjunto."""
    try:
        det = get_ensemble_details(id_ons)
        if not det:
            raise HTTPException(status_code=404, detail=f"Conjunto eólico '{id_ons}' não encontrado")
        return det
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao consultar conjunto {id_ons}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/sync")
def sync_catalog():
    """Sincroniza e reconstrói o catálogo completo de parques eólicos diretamente do ONS."""
    try:
        path = build_wind_catalog(force=True)
        return {"status": "success", "message": "Catálogo reconstruído com sucesso", "path": str(path)}
    except Exception as e:
        logger.error(f"Erro ao sincronizar catálogo ONS: {e}")
        raise HTTPException(status_code=500, detail=str(e))
