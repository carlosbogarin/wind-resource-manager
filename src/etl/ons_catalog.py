from __future__ import annotations

import json
import logging
from pathlib import Path
from typing import Any

import duckdb

from src.core.config import settings

logger = logging.getLogger("ons_catalog")
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)


def build_wind_catalog(force: bool = False) -> Path:
    """Gera ou atualiza o catálogo de parques eólicos e SEs coletoras a partir do ONS.

    Cruza:
    1. FATOR_CAPACIDADE: coordenadas da SE coletora (lat/lon), histórico de FC mensal e capacidade.
    2. RELACIONAMENTO_USINA_CONJUNTO: mapeia código do conjunto ONS (CJU_...) para CEG das usinas.
    3. CAPACIDADE_GERACAO: mapeia CEG para a empresa operadora (nom_agenteoperador).
    """
    settings.CATALOG_DIR.mkdir(parents=True, exist_ok=True)
    catalog_path = settings.CATALOG_PARQUET

    if catalog_path.exists() and not force:
        logger.info(f"Catálogo eólico já existe em {catalog_path}")
        return catalog_path

    logger.info("Iniciando construção do catálogo consolidado de parques eólicos do Brasil...")
    con = duckdb.connect()
    try:
        con.execute("INSTALL httpfs; LOAD httpfs;")
    except Exception as e:
        logger.warning(f"Extensão httpfs não pôde ser carregada: {e}")

    # URLs dos datasets ONS
    fc_url = settings.ONS_FATOR_CAPACIDADE_URL
    rel_url = settings.ONS_RELACIONAMENTO_URL
    cap_url = settings.ONS_CAPACIDADE_GERACAO_URL

    # Local fallback se existir no ambiente de desenvolvimento
    local_cap = Path("c:/Coding/Smart Curtailment/data/raw/capacidade/CAPACIDADE_GERACAO.parquet")
    cap_source = f"read_parquet('{local_cap.as_posix()}')" if local_cap.exists() else f"read_parquet('{cap_url}')"

    query = f"""
    WITH raw_conjunto AS (
        SELECT 
            TRIM(CAST(nom_usina_conjunto AS VARCHAR)) AS nom_usina_conjunto,
            TRIM(CAST(id_ons AS VARCHAR)) AS id_ons,
            TRIM(CAST(id_subsistema AS VARCHAR)) AS id_subsistema,
            TRIM(CAST(nom_subsistema AS VARCHAR)) AS nom_subsistema,
            TRIM(CAST(id_estado AS VARCHAR)) AS id_estado,
            TRIM(CAST(nom_estado AS VARCHAR)) AS nom_estado,
            TRIM(CAST(nom_pontoconexao AS VARCHAR)) AS nom_pontoconexao,
            ROUND(CAST(val_latitudesecoletora AS DOUBLE), 6) AS val_latitudesecoletora,
            ROUND(CAST(val_longitudesecoletora AS DOUBLE), 6) AS val_longitudesecoletora,
            ROUND(TRY_CAST(REPLACE(CAST(val_capacidadeinstalada AS VARCHAR), ',', '.') AS DOUBLE), 2) AS val_capacidadeinstalada_mw,
            din_instante,
            ROUND(TRY_CAST(REPLACE(CAST(val_fatorcapacidade AS VARCHAR), ',', '.') AS DOUBLE), 4) AS val_fatorcapacidade
        FROM read_parquet('{fc_url}')
        WHERE (nom_tipousina ILIKE '%e%lica%' OR nom_tipousina NOT LIKE '%Solar%')
          AND val_latitudesecoletora IS NOT NULL
          AND val_longitudesecoletora IS NOT NULL
          AND val_latitudesecoletora != 0.0
          AND val_longitudesecoletora != 0.0
    ),
    ultimos_dados AS (
        SELECT 
            nom_usina_conjunto,
            id_ons,
            id_subsistema,
            nom_subsistema,
            id_estado,
            nom_estado,
            nom_pontoconexao,
            val_latitudesecoletora,
            val_longitudesecoletora,
            val_capacidadeinstalada_mw
        FROM raw_conjunto
        QUALIFY ROW_NUMBER() OVER(PARTITION BY id_ons ORDER BY din_instante DESC) = 1
    ),
    historico_fc AS (
        SELECT
            id_ons,
            STRFTIME(CAST(din_instante AS TIMESTAMP), '%Y-%m') AS mes_ano,
            ROUND(AVG(val_fatorcapacidade), 4) AS fc_medio_mensal,
            ROUND(AVG(val_capacidadeinstalada_mw), 2) AS cap_media_mw
        FROM raw_conjunto
        GROUP BY 1, 2
        ORDER BY mes_ano
    ),
    historico_agg AS (
        SELECT
            id_ons,
            TO_JSON(LIST(STRUCT_PACK(
                mes_ano := mes_ano,
                fc := fc_medio_mensal,
                cap_mw := cap_media_mw
            ))) AS historico_fc_json
        FROM historico_fc
        GROUP BY id_ons
    ),
    rel AS (
        SELECT DISTINCT 
            TRIM(CAST(id_ons_conjunto AS VARCHAR)) AS id_ons_conjunto,
            TRIM(CAST(ceg AS VARCHAR)) AS ceg,
            TRIM(CAST(nom_usina AS VARCHAR)) AS nom_usina
        FROM read_parquet('{rel_url}')
        WHERE id_tipousina = 'UEE' OR nom_tipousina ILIKE '%eoli%'
    ),
    cap AS (
        SELECT DISTINCT 
            TRIM(CAST(ceg AS VARCHAR)) AS ceg,
            UPPER(TRIM(CAST(COALESCE(nom_agenteoperador, nom_agenteproprietario, 'OUTROS / INDEPENDENTES') AS VARCHAR))) AS nom_agenteoperador
        FROM {cap_source}
        WHERE nom_tipousina ILIKE '%eoli%'
    ),
    conjunto_empresa AS (
        SELECT 
            r.id_ons_conjunto,
            c.nom_agenteoperador,
            COUNT(DISTINCT r.ceg) AS qtd_usinas,
            STRING_AGG(DISTINCT r.nom_usina, ', ') AS lista_usinas
        FROM rel r
        JOIN cap c ON r.ceg = c.ceg
        GROUP BY 1, 2
    )
    SELECT 
        COALESCE(ce.nom_agenteoperador, 'OPERADORES INDEPENDENTES') AS nom_agenteoperador,
        ud.nom_usina_conjunto,
        ud.id_ons,
        ud.id_subsistema,
        ud.nom_subsistema,
        ud.id_estado,
        ud.nom_estado,
        ud.nom_pontoconexao,
        ud.val_latitudesecoletora,
        ud.val_longitudesecoletora,
        COALESCE(ud.val_capacidadeinstalada_mw, 0.0) AS val_capacidadeinstalada_mw,
        COALESCE(ce.qtd_usinas, 1) AS qtd_usinas,
        COALESCE(ce.lista_usinas, ud.nom_usina_conjunto) AS lista_usinas,
        COALESCE(ha.historico_fc_json, '[]') AS historico_fc_json
    FROM ultimos_dados ud
    LEFT JOIN conjunto_empresa ce ON ud.id_ons = ce.id_ons_conjunto
    LEFT JOIN historico_agg ha ON ud.id_ons = ha.id_ons
    ORDER BY nom_agenteoperador, ud.nom_usina_conjunto
    """

    con.execute(f"COPY ({query}) TO '{catalog_path.as_posix()}' (FORMAT PARQUET);")
    total_rows = con.execute(f"SELECT COUNT(*) FROM read_parquet('{catalog_path.as_posix()}')").fetchone()[0]
    total_companies = con.execute(
        f"SELECT COUNT(DISTINCT nom_agenteoperador) FROM read_parquet('{catalog_path.as_posix()}')"
    ).fetchone()[0]
    logger.info(
        f"Catálogo eólico gravado com sucesso! Total: {total_rows} conjuntos eólicos, {total_companies} empresas em {catalog_path}"
    )
    con.close()
    return catalog_path


def get_catalog_con() -> duckdb.DuckDBPyConnection:
    """Retorna uma conexão DuckDB pronta para consultas analíticas sobre o catálogo."""
    con = duckdb.connect(":memory:")
    cat_path = settings.CATALOG_PARQUET
    if not cat_path.exists():
        build_wind_catalog()
    con.execute(f"CREATE OR REPLACE VIEW vw_wind_catalog AS SELECT * FROM read_parquet('{cat_path.as_posix()}');")
    return con


def list_companies() -> list[dict[str, Any]]:
    """Lista todas as empresas operadoras e o sumário de conjuntos e potência."""
    con = get_catalog_con()
    res = con.execute("""
        SELECT 
            nom_agenteoperador,
            COUNT(*) AS total_conjuntos,
            ROUND(SUM(val_capacidadeinstalada_mw), 2) AS total_mw,
            STRING_AGG(DISTINCT id_estado, ', ') AS estados
        FROM vw_wind_catalog
        GROUP BY nom_agenteoperador
        ORDER BY total_mw DESC;
    """).fetchall()
    con.close()
    return [
        {
            "company_name": r[0],
            "total_ensembles": r[1],
            "total_mw": r[2],
            "states": r[3].split(", ") if r[3] else [],
        }
        for r in res
    ]


def list_ensembles_by_company(company_name: str) -> list[dict[str, Any]]:
    """Lista todos os conjuntos eólicos de uma determinada empresa."""
    con = get_catalog_con()
    res = con.execute(
        """
        SELECT 
            nom_usina_conjunto,
            id_ons,
            id_subsistema,
            nom_subsistema,
            id_estado,
            nom_estado,
            nom_pontoconexao,
            val_latitudesecoletora,
            val_longitudesecoletora,
            val_capacidadeinstalada_mw,
            qtd_usinas,
            lista_usinas,
            historico_fc_json
        FROM vw_wind_catalog
        WHERE UPPER(nom_agenteoperador) = UPPER(?)
        ORDER BY nom_usina_conjunto;
    """,
        [company_name],
    ).fetchall()
    con.close()

    ensembles = []
    for r in res:
        hist = []
        if r[12]:
            try:
                hist = json.loads(r[12])
            except Exception:
                hist = []
        ensembles.append(
            {
                "ensemble_name": r[0],
                "id_ons": r[1],
                "subsystem": r[2],
                "subsystem_name": r[3],
                "state": r[4],
                "state_name": r[5],
                "connection_point": r[6],
                "latitude": r[7],
                "longitude": r[8],
                "capacity_mw": r[9],
                "plant_count": r[10],
                "plants": r[11],
                "fc_history": hist,
            }
        )
    return ensembles


def get_ensemble_details(id_ons: str) -> dict[str, Any] | None:
    """Recupera detalhes completos de um conjunto eólico por id_ons."""
    con = get_catalog_con()
    res = con.execute(
        """
        SELECT 
            nom_agenteoperador,
            nom_usina_conjunto,
            id_ons,
            id_subsistema,
            nom_subsistema,
            id_estado,
            nom_estado,
            nom_pontoconexao,
            val_latitudesecoletora,
            val_longitudesecoletora,
            val_capacidadeinstalada_mw,
            qtd_usinas,
            lista_usinas,
            historico_fc_json
        FROM vw_wind_catalog
        WHERE id_ons = ?;
    """,
        [id_ons],
    ).fetchone()
    con.close()

    if not res:
        return None

    hist = []
    if res[13]:
        try:
            hist = json.loads(res[13])
        except Exception:
            hist = []

    return {
        "company_name": res[0],
        "ensemble_name": res[1],
        "id_ons": res[2],
        "subsystem": res[3],
        "subsystem_name": res[4],
        "state": res[5],
        "state_name": res[6],
        "connection_point": res[7],
        "latitude": res[8],
        "longitude": res[9],
        "capacity_mw": res[10],
        "plant_count": res[11],
        "plants": res[12],
        "fc_history": hist,
    }
