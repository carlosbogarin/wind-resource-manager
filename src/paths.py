"""Fonte única e centralizada de caminhos de diretórios e arquivos do projeto."""

from __future__ import annotations

from pathlib import Path

# Raiz do repositório (C:\Coding\Wind Resource Manager ou /app no contêiner)
ROOT_DIR: Path = Path(__file__).resolve().parent.parent

# Estrutura de dados interna do projeto
DATA_DIR: Path = ROOT_DIR / "data"
CATALOG_DIR: Path = DATA_DIR / "catalog"
CATALOG_PARQUET: Path = CATALOG_DIR / "wind_catalog.parquet"
CATALOG_DB_PATH: Path = DATA_DIR / "reanalysis_catalog.duckdb"
REANALYSIS_DIR: Path = DATA_DIR / "reanalysis"
ONS_EOL_DETAIL_DATA_DIR: Path = DATA_DIR / "ons_eolica_detail"
ONS_EOL_DETAIL_CACHE_DIR: Path = ONS_EOL_DETAIL_DATA_DIR / "cache"
MET_MAST_DIR: Path = DATA_DIR / "met_mast"
MET_MAST_UPLOAD_DIR: Path = MET_MAST_DIR / "uploads"
MET_MAST_SESSIONS_DIR: Path = MET_MAST_DIR / "sessions"

# Bases locais externas opcionais em ambiente de desenvolvimento Windows
EXTERNAL_ONS_EOL_DETAIL_LOCAL_DIR: Path = Path("C:/Coding/Smart Curtailment/Inputs/ONS_eolica_detail")
EXTERNAL_CAPACIDADE_GERACAO_LOCAL: Path = Path(
    "c:/Coding/Smart Curtailment/data/raw/capacidade/CAPACIDADE_GERACAO.parquet"
)
