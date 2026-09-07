from __future__ import annotations

import io
import logging

from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import Response, StreamingResponse

from src.analytics.spatial_interpolation import (
    find_existing_vortex_file,
    get_vortex_cache_path,
    load_vortex_series,
)
from src.etl.date_range_checker import filter_df_by_period
from src.etl.era5_client import get_era5_cache_path, load_era5_series
from src.etl.merra2_client import get_merra2_cache_path, load_merra2_series

logger = logging.getLogger("api.export")
router = APIRouter(prefix="/export", tags=["Exportação de Dados"])


@router.get("/csv")
def export_csv(
    node_id: str = Query(...),
    model: str = Query(...),
    latitude: float = Query(...),
    longitude: float = Query(...),
    start_year: int = Query(default=1994),
    end_year: int = Query(default=2024),
    start_month: str | None = Query(default=None, description="Formato AAAA-MM"),
    end_month: str | None = Query(default=None, description="Formato AAAA-MM"),
):
    """Exporta a série temporal horária completa em formato CSV."""
    try:
        if node_id.startswith("VORTEX"):
            df = load_vortex_series(model, latitude, longitude, start_year, end_year)
        elif model == "ERA5":
            df = load_era5_series(node_id, latitude, longitude, start_year, end_year)
        else:
            df = load_merra2_series(node_id, latitude, longitude, start_year, end_year)

        if df is None or len(df) == 0:
            raise HTTPException(status_code=404, detail="Dados não encontrados para exportação.")

        df = filter_df_by_period(df, start_month, end_month)

        buffer = io.BytesIO()
        df.write_csv(buffer)
        buffer.seek(0)

        suffix = f"{start_month}_{end_month}" if start_month and end_month else f"{start_year}_{end_year}"
        filename = f"{model}_{node_id}_{suffix}.csv"
        return StreamingResponse(
            buffer,
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename={filename}"},
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao exportar CSV: {e}")
        raise HTTPException(status_code=500, detail=str(e))



@router.get("/parquet")
def export_parquet(
    node_id: str = Query(...),
    model: str = Query(...),
    latitude: float = Query(...),
    longitude: float = Query(...),
    start_year: int = Query(default=1994),
    end_year: int = Query(default=2024),
):
    """Exporta o arquivo colunar Parquet de alta densidade."""
    try:
        if node_id.startswith("VORTEX"):
            path = get_vortex_cache_path(model, latitude, longitude, start_year, end_year)
            if not path.exists():
                existing = find_existing_vortex_file(model, latitude, longitude)
                if existing:
                    path = existing
                else:
                    raise HTTPException(status_code=404, detail="Arquivo Parquet extrapolado não encontrado.")
        elif model == "ERA5":
            path = get_era5_cache_path(node_id, latitude, longitude, start_year, end_year)
            if not path.exists():
                load_era5_series(node_id, latitude, longitude, start_year, end_year)
        else:
            path = get_merra2_cache_path(node_id, latitude, longitude, start_year, end_year)
            if not path.exists():
                load_merra2_series(node_id, latitude, longitude, start_year, end_year)

        if not path.exists():
            raise HTTPException(status_code=404, detail="Arquivo Parquet não encontrado.")

        filename = path.name
        with open(path, "rb") as f:
            content = f.read()

        return Response(
            content=content,
            media_type="application/octet-stream",
            headers={"Content-Disposition": f"attachment; filename={filename}"},
        )
    except Exception as e:
        logger.error(f"Erro ao exportar Parquet: {e}")
        raise HTTPException(status_code=500, detail=str(e))
