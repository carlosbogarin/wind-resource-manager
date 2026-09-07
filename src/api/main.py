from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from src.api.routes.catalog import router as catalog_router
from src.api.routes.export import router as export_router
from src.api.routes.reanalysis import router as reanalysis_router
from src.core.config import settings
from src.etl.ons_catalog import build_wind_catalog

logger = logging.getLogger("api.main")
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Ciclo de vida do FastAPI: inicialização e liberação de recursos."""
    logger.info(f"Iniciando {settings.PROJECT_NAME} v{settings.VERSION}...")
    settings.DATA_DIR.mkdir(parents=True, exist_ok=True)
    settings.CATALOG_DIR.mkdir(parents=True, exist_ok=True)
    settings.REANALYSIS_DIR.mkdir(parents=True, exist_ok=True)

    # Verificar se o catálogo de parques eólicos já existe
    if not settings.CATALOG_PARQUET.exists():
        logger.info("Catálogo eólico não encontrado. Inicializando construção automática a partir do ONS...")
        try:
            build_wind_catalog(force=False)
        except Exception as e:
            logger.warning(f"Falha ao gerar catálogo inicial na inicialização (será tentado sob demanda): {e}")

    # Sincronizar catálogo de nós de reanálise no DuckDB com arquivos existentes no disco
    try:
        from src.database.reanalysis_catalog import sync_reanalysis_disk_to_duckdb
        sync_reanalysis_disk_to_duckdb()
    except Exception as e:
        logger.warning(f"Falha ao sincronizar catálogo de reanálise DuckDB na inicialização: {e}")

    yield
    logger.info(f"Encerrando {settings.PROJECT_NAME}...")


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description=(
        "API Padrão Ouro para Gestão de Recursos Eólicos no Brasil. "
        "Catalogação de parques eólicos ONS, cálculo espacial das malhas ERA5 e MERRA-2, "
        "download de séries temporais de 30 anos e analytics avançado."
    ),
    lifespan=lifespan,
)

# Configuração de CORS para compatibilidade total Localhost + Vercel
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Registrar rotas
app.include_router(catalog_router, prefix="/api")
app.include_router(reanalysis_router, prefix="/api")
app.include_router(export_router, prefix="/api")


@app.get("/")
def root():
    return {
        "app": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "status": "online",
        "docs": "/docs",
    }


@app.get("/api/health")
def health_check():
    """Endpoint de integridade para probes do Google Cloud Run e monitoramento."""
    has_catalog = settings.CATALOG_PARQUET.exists()
    return {
        "status": "healthy",
        "version": settings.VERSION,
        "catalog_ready": has_catalog,
        "environment": settings.ENVIRONMENT,
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "src.api.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=True,
    )
