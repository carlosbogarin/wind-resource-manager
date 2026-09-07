from __future__ import annotations

import os
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parent.parent.parent
DATA_DIR = BASE_DIR / "data"
CATALOG_DIR = DATA_DIR / "catalog"
REANALYSIS_DIR = DATA_DIR / "reanalysis"
RAW_DIR = DATA_DIR / "raw"


class Settings(BaseSettings):
    """Configurações centrais do Wind Resource Manager."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    PROJECT_NAME: str = "Wind Resource Manager"
    VERSION: str = "1.5.0"
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")
    PORT: int = int(os.getenv("PORT", "8000"))
    HOST: str = "0.0.0.0"

    # Diretórios
    BASE_DIR: Path = BASE_DIR
    DATA_DIR: Path = DATA_DIR
    CATALOG_DIR: Path = CATALOG_DIR
    REANALYSIS_DIR: Path = REANALYSIS_DIR
    RAW_DIR: Path = RAW_DIR

    # Arquivos de dados
    CATALOG_PARQUET: Path = CATALOG_DIR / "wind_catalog.parquet"

    # URLs ONS
    ONS_FATOR_CAPACIDADE_URL: str = "https://ons-aws-prod-opendata.s3.amazonaws.com/dataset/fator_capacidade_2_di/FATOR_CAPACIDADE-2_2026_08.parquet"
    ONS_RELACIONAMENTO_URL: str = (
        "https://ons-aws-prod-opendata.s3.amazonaws.com/dataset/usina_conjunto/RELACIONAMENTO_USINA_CONJUNTO.parquet"
    )
    ONS_CAPACIDADE_GERACAO_URL: str = (
        "https://ons-aws-prod-opendata.s3.amazonaws.com/dataset/capacidade-geracao/CAPACIDADE_GERACAO.parquet"
    )
    ONS_CKAN_EOL_DETAIL_URL: str = (
        "https://dados.ons.org.br/api/3/action/package_show?id=restricao_coff_eolica_detail"
    )
    ONS_EOL_DETAIL_LOCAL_DIR: Path = Path("C:/Coding/Smart Curtailment/Inputs/ONS_eolica_detail")
    ONS_EOL_DETAIL_DATA_DIR: Path = DATA_DIR / "ons_eolica_detail"

    @property
    def ONS_EOL_DETAIL_DIR(self) -> Path:
        if self.ONS_EOL_DETAIL_LOCAL_DIR.exists() and any(self.ONS_EOL_DETAIL_LOCAL_DIR.glob("*.parquet")):
            return self.ONS_EOL_DETAIL_LOCAL_DIR
        return self.ONS_EOL_DETAIL_DATA_DIR

    # Reanálise
    OPEN_METEO_ARCHIVE_URL: str = "https://archive-api.open-meteo.com/v1/archive"
    NASA_POWER_HOURLY_URL: str = "https://power.larc.nasa.gov/api/temporal/hourly/point"
    CDS_API_URL: str = os.getenv("CDS_API_URL", "https://cds.climate.copernicus.eu/api")
    CDS_API_KEY: str = os.getenv("CDS_API_KEY", "")

    # CORS
    CORS_ORIGINS: list[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
        "https://*.vercel.app",
        "*",
    ]


settings = Settings()
