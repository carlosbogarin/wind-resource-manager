from __future__ import annotations

import hashlib
import logging

from fastapi import APIRouter, File, Header, HTTPException, Query, UploadFile
from fastapi.responses import PlainTextResponse, StreamingResponse

from src.analytics.met_mast import met_mast_service, sanitize_session_id
from src.api.schemas.met_mast import (
    MetMast12x24Response,
    MetMastDatasetItem,
    MetMastLoadedDataset,
    MetMastLoadRequest,
    MetMastQCResult,
    MetMastQCRulesRequest,
    MetMastTimeseriesResponse,
    MetMastTurbulenceResponse,
    MetMastUploadResponse,
    MetMastWaspExportRequest,
    MetMastWeibullResponse,
    MetMastWindRoseResponse,
    MetMastWindShearRequest,
    MetMastWindShearResponse,
)

logger = logging.getLogger("api.met_mast")
router = APIRouter(prefix="/met-mast", tags=["Torres Anemométricas & LiDAR"])


def _resolve_session_id(
    explicit_session: str | None,
    x_metmast_session: str | None,
    x_portal_user: str | None,
) -> str:
    """Resolve o identificador da sessão com suporte a uso local e multiusuário no gateway."""
    if explicit_session and explicit_session.strip() and explicit_session.strip() != "default":
        return sanitize_session_id(explicit_session)
    if x_metmast_session and x_metmast_session.strip():
        return sanitize_session_id(x_metmast_session)
    if x_portal_user and x_portal_user.strip():
        digest = hashlib.sha256(x_portal_user.strip().lower().encode("utf-8")).hexdigest()[:16]
        return f"user_{digest}"
    return "default"


@router.get("/datasets", response_model=list[MetMastDatasetItem])
def list_met_mast_datasets():
    """Lista datasets integrados e arquivos enviados de torres anemométricas."""
    return met_mast_service.list_datasets()


@router.post("/datasets/load", response_model=MetMastLoadedDataset)
def load_met_mast_dataset(
    req: MetMastLoadRequest,
    x_metmast_session: str | None = Header(default=None),
    x_portal_user: str | None = Header(default=None),
):
    """Carrega um dataset de torre anemométrica e extrai metadados de sensores."""
    session_id = _resolve_session_id(req.session_id, x_metmast_session, x_portal_user)
    try:
        return met_mast_service.load_dataset(req.dataset_id, session_id=session_id)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    except Exception as exc:
        logger.error(f"Erro ao carregar dataset {req.dataset_id}: {exc}")
        raise HTTPException(status_code=400, detail=str(exc))


@router.post("/datasets/upload", response_model=MetMastUploadResponse)
async def upload_met_mast_dataset(file: UploadFile = File(...)):
    """Faz upload de arquivo de campanha anemométrica (.csv, .txt, .dat, .tim)."""
    if not file.filename:
        raise HTTPException(status_code=400, detail="Nome de arquivo ausente.")
    try:
        contents = await file.read()
        return met_mast_service.save_uploaded_file(file.filename, contents)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:
        logger.error(f"Erro no upload do arquivo {file.filename}: {exc}")
        raise HTTPException(status_code=500, detail=f"Falha ao gravar arquivo: {exc}")


@router.get("/timeseries", response_model=MetMastTimeseriesResponse)
def get_met_mast_timeseries(
    columns: str = Query(..., description="Lista de colunas separadas por vírgula"),
    max_points: int = Query(default=1500, ge=100, le=10000),
    start_date: str | None = Query(default=None),
    end_date: str | None = Query(default=None),
    dataset_id: str | None = Query(default=None),
    session_id: str | None = Query(default=None),
    x_metmast_session: str | None = Header(default=None),
    x_portal_user: str | None = Header(default=None),
):
    """Retorna série temporal downsampled de canais da torre."""
    resolved_session = _resolve_session_id(session_id, x_metmast_session, x_portal_user)
    try:
        col_list = [c.strip() for c in columns.split(",") if c.strip()]
        return met_mast_service.get_timeseries(
            columns=col_list,
            max_points=max_points,
            start_date=start_date,
            end_date=end_date,
            session_id=resolved_session,
            dataset_id=dataset_id,
        )
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.post("/qc/apply", response_model=MetMastQCResult)
def apply_met_mast_qc(
    req: MetMastQCRulesRequest,
    x_metmast_session: str | None = Header(default=None),
    x_portal_user: str | None = Header(default=None),
):
    """Aplica regras de Controle de Qualidade (limites físicos, sombra de torre e gelo)."""
    resolved_session = _resolve_session_id(req.session_id, x_metmast_session, x_portal_user)
    try:
        return met_mast_service.apply_qc_rules(
            speed_col=req.speed_col,
            min_speed=req.min_speed,
            max_speed=req.max_speed,
            direction_col=req.direction_col,
            shadow_sector_start=req.shadow_sector_start,
            shadow_sector_end=req.shadow_sector_end,
            temp_col=req.temp_col,
            min_temp_icing=req.min_temp_icing,
            std_col=req.std_col,
            min_std_frozen=req.min_std_frozen,
            session_id=resolved_session,
            dataset_id=req.dataset_id,
        )
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.post("/qc/reset", response_model=MetMastQCResult)
def reset_met_mast_qc(
    dataset_id: str | None = Query(default=None),
    session_id: str | None = Query(default=None),
    x_metmast_session: str | None = Header(default=None),
    x_portal_user: str | None = Header(default=None),
):
    """Remove os filtros de QC ativos na sessão atual."""
    resolved_session = _resolve_session_id(session_id, x_metmast_session, x_portal_user)
    try:
        return met_mast_service.reset_qc_rules(session_id=resolved_session, dataset_id=dataset_id)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.get("/analysis/wind-rose", response_model=MetMastWindRoseResponse)
def get_met_mast_wind_rose(
    speed_col: str = Query(...),
    direction_col: str = Query(...),
    sectors: int = Query(default=16),
    apply_qc: bool = Query(default=True),
    dataset_id: str | None = Query(default=None),
    session_id: str | None = Query(default=None),
    x_metmast_session: str | None = Header(default=None),
    x_portal_user: str | None = Header(default=None),
):
    """Calcula Rosa dos Ventos setorial para torre anemométrica."""
    resolved_session = _resolve_session_id(session_id, x_metmast_session, x_portal_user)
    try:
        return met_mast_service.calculate_wind_rose(
            speed_col=speed_col,
            direction_col=direction_col,
            sectors=sectors,
            apply_qc=apply_qc,
            session_id=resolved_session,
            dataset_id=dataset_id,
        )
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.post("/analysis/wind-shear", response_model=MetMastWindShearResponse)
def get_met_mast_wind_shear(
    req: MetMastWindShearRequest,
    x_metmast_session: str | None = Header(default=None),
    x_portal_user: str | None = Header(default=None),
):
    """Calcula perfil de cisalhamento vertical (Power Law & Log Law) e extrapolação ao cubo."""
    resolved_session = _resolve_session_id(req.session_id, x_metmast_session, x_portal_user)
    try:
        anem_dicts = [{"column": a.column, "height": a.height} for a in req.anemometers]
        return met_mast_service.calculate_wind_shear(
            anemometers=anem_dicts,
            hub_heights=req.hub_heights,
            min_speed=req.min_speed,
            apply_qc=req.apply_qc,
            session_id=resolved_session,
            dataset_id=req.dataset_id,
        )
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.get("/analysis/turbulence", response_model=MetMastTurbulenceResponse)
def get_met_mast_turbulence(
    speed_col: str = Query(...),
    std_col: str = Query(...),
    min_speed: float = Query(default=3.0),
    apply_qc: bool = Query(default=True),
    dataset_id: str | None = Query(default=None),
    session_id: str | None = Query(default=None),
    x_metmast_session: str | None = Header(default=None),
    x_portal_user: str | None = Header(default=None),
):
    """Calcula Intensidade de Turbulência (TI) com referência IEC 61400-1 Classes A/B/C."""
    resolved_session = _resolve_session_id(session_id, x_metmast_session, x_portal_user)
    try:
        return met_mast_service.calculate_turbulence(
            speed_col=speed_col,
            std_col=std_col,
            min_speed=min_speed,
            apply_qc=apply_qc,
            session_id=resolved_session,
            dataset_id=dataset_id,
        )
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.get("/analysis/12x24", response_model=MetMast12x24Response)
def get_met_mast_12x24(
    speed_col: str = Query(...),
    apply_qc: bool = Query(default=True),
    dataset_id: str | None = Query(default=None),
    session_id: str | None = Query(default=None),
    x_metmast_session: str | None = Header(default=None),
    x_portal_user: str | None = Header(default=None),
):
    """Gera matriz média diurna-sazonal 12x24."""
    resolved_session = _resolve_session_id(session_id, x_metmast_session, x_portal_user)
    try:
        return met_mast_service.calculate_12x24(
            speed_col=speed_col,
            apply_qc=apply_qc,
            session_id=resolved_session,
            dataset_id=dataset_id,
        )
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.get("/analysis/weibull", response_model=MetMastWeibullResponse)
def get_met_mast_weibull(
    speed_col: str = Query(...),
    apply_qc: bool = Query(default=True),
    dataset_id: str | None = Query(default=None),
    session_id: str | None = Query(default=None),
    x_metmast_session: str | None = Header(default=None),
    x_portal_user: str | None = Header(default=None),
):
    """Calcula distribuição de Weibull (k, c) e histograma empírico."""
    resolved_session = _resolve_session_id(session_id, x_metmast_session, x_portal_user)
    try:
        return met_mast_service.calculate_weibull(
            speed_col=speed_col,
            apply_qc=apply_qc,
            session_id=resolved_session,
            dataset_id=dataset_id,
        )
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.post("/export/wasp-tab")
def export_met_mast_wasp_tab(
    req: MetMastWaspExportRequest,
    x_metmast_session: str | None = Header(default=None),
    x_portal_user: str | None = Header(default=None),
):
    """Exporta arquivo de frequência eólica no formato oficial WAsP (.tab)."""
    resolved_session = _resolve_session_id(req.session_id, x_metmast_session, x_portal_user)
    try:
        tab_content = met_mast_service.export_wasp_tab(
            speed_col=req.speed_col,
            direction_col=req.direction_col,
            height=req.height,
            lat=req.lat,
            lon=req.lon,
            mast_name=req.mast_name,
            apply_qc=req.apply_qc,
            session_id=resolved_session,
            dataset_id=req.dataset_id,
        )
        filename = f"{req.mast_name}_{int(round(req.height))}m.tab"
        return PlainTextResponse(
            content=tab_content,
            headers={"Content-Disposition": f'attachment; filename="{filename}"'},
        )
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.get("/export/clean-csv")
def export_met_mast_clean_csv(
    apply_qc: bool = Query(default=True),
    dataset_id: str | None = Query(default=None),
    session_id: str | None = Query(default=None),
    x_metmast_session: str | None = Header(default=None),
    x_portal_user: str | None = Header(default=None),
):
    """Exporta série temporal tratada pós-QC em CSV."""
    resolved_session = _resolve_session_id(session_id, x_metmast_session, x_portal_user)
    try:
        csv_content, filename = met_mast_service.export_clean_csv(
            apply_qc=apply_qc,
            session_id=resolved_session,
            dataset_id=dataset_id,
        )
        return StreamingResponse(
            iter([csv_content]),
            media_type="text/csv; charset=utf-8",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'},
        )
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc))
