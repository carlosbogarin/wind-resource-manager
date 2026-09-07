# Changelog - Wind Resource Manager

Todas as alterações notáveis neste projeto serão documentadas neste arquivo.
O formato é baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/)
e este projeto adere ao [Semantic Versioning](https://semver.org/lang/pt-BR/).

---

## [1.0.0] - 2026-09-07

### ✨ Adicionado (Lançamento Inicial)
- **Catálogo Eólico ONS**:
  - Ingestão automatizada e cruzamento colunar entre `FATOR_CAPACIDADE`, `RELACIONAMENTO_USINA_CONJUNTO` e `CAPACIDADE_GERACAO`.
  - Mapeamento das coordenadas da Subestação Coletora (`val_latitudesecoletora`, `val_longitudesecoletora`), nome do conjunto (`nom_usina_conjunto`) e empresa operadora (`nom_agenteoperador`).
  - Histórico mensal de fator de capacidade gravado em JSON colunar compactado.
  - Armazenamento em formato Parquet (`data/catalog/wind_catalog.parquet`) para consultas em menos de 10ms.
- **Motor Geodésico de Reanálise**:
  - Cálculo espacial das malhas regulares do **ERA5** (0,25° x 0,25°) e **MERRA-2** (0,5° x 0,625°).
  - Cálculo dos 4 nós circundantes (NW, NE, SW, SE) com distância esférica de Haversine (km), azimute (graus) e direção cardeal.
  - Ponderação por inverso da distância ponderada (IDW) para interpolação na SE Coletora.
- **Download Histórico de 30 Anos sob Demanda**:
  - Conector Open-Meteo para a base histórica oficial do ERA5 (1940 até hoje) com vento a 100m, 10m, direção, pressão e temperatura.
  - Conector NASA POWER para a base MERRA-2 com vento a 50m, 10m e extrapolação ao rotor de 100m via lei de potência de cisalhamento.
  - Cache colunar local em Parquet com particionamento temporal para máxima performance.
- **Frontend Padrão Ouro (React 19 + TypeScript + Vite + Tailwind CSS)**:
  - Seleção em dois passos: Empresa Operadora e Conjunto Eólico com busca e métricas de capacidade instalada (MW).
  - Mapa interativo (Leaflet) com polígonos delimitadores e marcadores distintos para SE Coletora, nós ERA5 e nós MERRA-2.
  - Tabela comparativa dos 8 nós com status de cache e botões de download.
  - Visualização gráfica analítica em **Apache ECharts**:
    - Série Temporal contínua com slider `dataZoom` e alternância diária/mensal/horária.
    - Rosa dos Ventos com 16 setores e faixas de velocidade padronizadas.
    - Distribuição de Weibull ($k$ e $c$) ajustada por máxima verossimilhança.
    - Perfil Diurno Médio (00h a 23h) com bandas percentílicas P10 e P90.
    - Sazonalidade Mensal (Jan a Dez).
    - Comparação com o Fator de Capacidade real do ONS.
  - Barra de exportação para arquivos **CSV** e **Parquet**.
- **Infraestrutura e Deploy**:
  - Scripts `.bat` para inicialização local no Windows em um clique (`Iniciar_Wind_Resource_Manager.bat`, `Iniciar_Backend.bat`, `Iniciar_Frontend.bat`).
  - `Dockerfile` configurado para contêineres Linux no Google Cloud Run com suporte a porta dinâmica `$PORT` e fuso horário de Brasília.
  - Configuração `vercel.json` para deploy estático com SPA rewrites.
  - Suíte de testes automatizados com Pytest (`tests/test_backend.py`) e validação de código com Ruff.
  - Guia `COMO_SUBIR_GITHUB.md` com o passo a passo para publicação no repositório remoto.