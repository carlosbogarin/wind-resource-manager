from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field


class MetMastDatasetItem(BaseModel):
    """Representa um conjunto de dados anemométricos disponível (integrado ou enviado)."""

    id: str
    name: str
    description: str
    type: str = Field(..., description="'builtin' ou 'uploaded'")
    filename: str


class MetMastColumnInfo(BaseModel):
    """Metadados detectados para um canal da torre anemométrica / LiDAR."""

    name: str
    role: str
    height: float | None = None
    orientation: str = ""
    unit: str = ""


class MetMastColumnStat(BaseModel):
    """Estatísticas resumidas de disponibilidade e amplitude de um canal."""

    coverage_pct: float
    mean: float | None = None
    min: float | None = None
    max: float | None = None
    std: float | None = None


class MetMastQCResult(BaseModel):
    """Resumo da aplicação das regras de Controle de Qualidade (QC)."""

    total_points: int
    valid_points: int
    flagged_points: int
    valid_pct: float
    flagged_by_rule: dict[str, int] = Field(default_factory=dict)


class MetMastLoadedDataset(BaseModel):
    """Resposta completa após carregamento e análise inicial da campanha."""

    dataset_id: str
    session_id: str = "default"
    total_rows: int
    start_time: str
    end_time: str
    sampling_interval_min: int
    columns: list[MetMastColumnInfo]
    stats: dict[str, MetMastColumnStat]
    qc_applied: bool = False
    qc_summary: MetMastQCResult | None = None


class MetMastLoadRequest(BaseModel):
    """Requisição para carregar um dataset de torre em sessão."""

    dataset_id: str
    session_id: str = "default"


class MetMastUploadResponse(BaseModel):
    """Resposta de upload de arquivo anemométrico."""

    status: str
    dataset_id: str
    filename: str
    size_bytes: int


class MetMastTimeseriesResponse(BaseModel):
    """Série temporal amostrada de múltiplos canais para visualização de alta performance."""

    timestamps: list[str]
    series: dict[str, list[float | None]]
    valid_mask: list[bool] = Field(default_factory=list)
    total_raw_points: int = 0
    sampled_points: int = 0
    downsample_factor: int = 1
    qc_applied: bool = False


class MetMastQCRulesRequest(BaseModel):
    """Parâmetros das regras de Controle de Qualidade para torre anemométrica."""

    speed_col: str
    min_speed: float = 0.0
    max_speed: float = 45.0
    direction_col: str | None = None
    shadow_sector_start: float | None = None
    shadow_sector_end: float | None = None
    temp_col: str | None = None
    min_temp_icing: float | None = None
    std_col: str | None = None
    min_std_frozen: float | None = None
    session_id: str = "default"
    dataset_id: str | None = None


class MetMastAnemometerConfig(BaseModel):
    """Configuração de coluna anemométrica e altura de medição (m)."""

    column: str
    height: float


class MetMastWindShearRequest(BaseModel):
    """Parâmetros para cálculo de perfil de cisalhamento vertical e extrapolação."""

    anemometers: list[MetMastAnemometerConfig]
    hub_heights: list[float] = Field(default_factory=lambda: [100.0, 120.0, 140.0, 160.0])
    min_speed: float = 3.0
    apply_qc: bool = True
    session_id: str = "default"
    dataset_id: str | None = None


class MetMastWaspExportRequest(BaseModel):
    """Parâmetros para geração da tabela de frequências direcionais no padrão WAsP (.tab)."""

    speed_col: str
    direction_col: str
    height: float
    lat: float = -5.0
    lon: float = -38.0
    mast_name: str = "Torre_Eolica_01"
    apply_qc: bool = True
    session_id: str = "default"
    dataset_id: str | None = None


class MetMastWindRoseResponse(BaseModel):
    sectors: int
    sector_width: float
    total_records: int
    mean_speed: float
    speed_bin_labels: list[str]
    sector_data: list[dict[str, Any]]


class MetMastWindShearResponse(BaseModel):
    alpha: float
    roughness_z0: float | None = None
    reference_height: float
    reference_speed: float
    measured_points: list[dict[str, Any]]
    profile_curve: list[dict[str, Any]]
    extrapolated_hub_heights: list[dict[str, Any]]


class MetMastTurbulenceResponse(BaseModel):
    speed_column: str
    std_column: str
    speed_bins: list[dict[str, Any]]
    char_ti_at_15ms: float | None = None


class MetMast12x24Response(BaseModel):
    months: list[str]
    hours: list[str]
    matrix: list[list[float | None]]


class MetMastWeibullResponse(BaseModel):
    k_shape: float
    c_scale: float
    mean_speed: float
    std_speed: float | None = None
    histogram: list[dict[str, Any]]
    fitted_curve: list[dict[str, Any]]
