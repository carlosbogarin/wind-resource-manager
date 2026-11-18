# Changelog - Wind Resource Manager

Todas as alterações notáveis neste projeto serão documentadas neste arquivo.
O formato é baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/)
e este projeto adere ao [Semantic Versioning](https://semver.org/lang/pt-BR/).

## [2.0.1] - 2026-11-18

### 🧹 Reorganização Estrutural, Higiene de Código & Governança de IA
- **Fonte Única de Caminhos ([`src/paths.py`](file:///c:/Coding/Wind%20Resource%20Manager/src/paths.py)):**
  - Centralização de todos os caminhos do projeto (`ROOT_DIR`, `DATA_DIR`, `CATALOG_DIR`, `CATALOG_PARQUET`, `CATALOG_DB_PATH`, `REANALYSIS_DIR`, `ONS_EOL_DETAIL_DATA_DIR`, `ONS_EOL_DETAIL_CACHE_DIR`, `MET_MAST_DIR`, `MET_MAST_UPLOAD_DIR`, `MET_MAST_SESSIONS_DIR` e caminhos locais externos opcionais) em `src/paths.py`.
  - Atualização de [`src/core/config.py`](file:///c:/Coding/Wind%20Resource%20Manager/src/core/config.py), [`src/database/reanalysis_catalog.py`](file:///c:/Coding/Wind%20Resource%20Manager/src/database/reanalysis_catalog.py), [`src/etl/ons_catalog.py`](file:///c:/Coding/Wind%20Resource%20Manager/src/etl/ons_catalog.py) e [`src/etl/ons_eol_detail.py`](file:///c:/Coding/Wind%20Resource%20Manager/src/etl/ons_eol_detail.py) para consumir `src.paths`, eliminando caminhos avulsos e a constante sem uso `RAW_DIR`.
- **Instruções Únicas para Agentes de IA & Documentação:**
  - Consolidação das regras em [`AGENTS.md`](file:///c:/Coding/Wind%20Resource%20Manager/AGENTS.md) na raiz (incluindo estrutura obrigatória de pastas e regras de organização/limpeza), com apontadores minimalistas em [`CLAUDE.md`](file:///c:/Coding/Wind%20Resource%20Manager/CLAUDE.md), [`GEMINI.md`](file:///c:/Coding/Wind%20Resource%20Manager/GEMINI.md) e [`.agent/rules/wind-resource-manager.md`](file:///c:/Coding/Wind%20Resource%20Manager/.agent/rules/wind-resource-manager.md), removendo `rules.md`.
  - Movimentação de `COMO_SUBIR_GITHUB.md` via `git mv` para [`docs/COMO_SUBIR_GITHUB.md`](file:///c:/Coding/Wind%20Resource%20Manager/docs/COMO_SUBIR_GITHUB.md) e atualização do [`README.md`](file:///c:/Coding/Wind%20Resource%20Manager/README.md) e [`Iniciar_Wind_Resource_Manager.bat`](file:///c:/Coding/Wind%20Resource%20Manager/Iniciar_Wind_Resource_Manager.bat) (corrigindo a referência de `React 19` para `React 18`).
- **Limpeza de Código Morto & Isolamento de Testes:**
  - Remoção do componente órfão `CapacityFactorComparison.tsx`, variáveis CSS sem uso em [`frontend/src/index.css`](file:///c:/Coding/Wind%20Resource%20Manager/frontend/src/index.css), escalas sem uso em [`frontend/tailwind.config.js`](file:///c:/Coding/Wind%20Resource%20Manager/frontend/tailwind.config.js), exports/tipos mortos em [`frontend/src/services/api.ts`](file:///c:/Coding/Wind%20Resource%20Manager/frontend/src/services/api.ts) e [`frontend/src/types/index.ts`](file:///c:/Coding/Wind%20Resource%20Manager/frontend/src/types/index.ts), além de 15 imports/variáveis não utilizados nos componentes React.
  - Criação de [`tests/conftest.py`](file:///c:/Coding/Wind%20Resource%20Manager/tests/conftest.py) e isolamento de [`tests/test_met_mast.py`](file:///c:/Coding/Wind%20Resource%20Manager/tests/test_met_mast.py) em `tmp_path` para não sujar `data/met_mast/`.
  - Reforço do [`.gitignore`](file:///c:/Coding/Wind%20Resource%20Manager/.gitignore), [`.dockerignore`](file:///c:/Coding/Wind%20Resource%20Manager/.dockerignore) e [`Dockerfile`](file:///c:/Coding/Wind%20Resource%20Manager/Dockerfile).

---

## [2.0.0] - 2026-11-17

### ✨ Consolidação Unificada: Módulo Integrado "Torres Anemométricas & LiDAR"
- **Unificação Arquitetural Completa**:
  - Incorporação nativa das capacidades de engenharia de torres anemométricas (Met Masts / LiDAR) diretamente na plataforma **Wind Resource Manager**, eliminando projetos paralelos redundantes e mantendo uma única interface unificada com suporte completo aos modos Claro e Escuro (`theme: 'light' | 'dark'`).
- **Backend Modular com BrightWind & Isolamento por Sessão**:
  - Criado o motor [`src/analytics/met_mast.py`](file:///c:/Coding/Wind%20Resource%20Manager/src/analytics/met_mast.py), esquemas Pydantic v2 em [`src/api/schemas/met_mast.py`](file:///c:/Coding/Wind%20Resource%20Manager/src/api/schemas/met_mast.py) e rotas REST `/api/met-mast/*` em [`src/api/routes/met_mast.py`](file:///c:/Coding/Wind%20Resource%20Manager/src/api/routes/met_mast.py).
  - Isolamento por sessão (`X-MetMast-Session` / `X-Portal-User`) com persistência leve em disco e sanitização estrita de caminhos no upload (`.csv`, `.txt`, `.dat`, `.tim`).
  - Compatibilidade multi-ambiente garantida para Localhost, Vercel (`VITE_API_URL`) e Google Cloud Run ([`Dockerfile`](file:///c:/Coding/Wind%20Resource%20Manager/Dockerfile) com `MPLBACKEND=Agg`).
- **Frontend Integrado (`MetMastStudio`)**:
  - Novo módulo **"Torres Anemométricas"** na barra lateral ([`Sidebar.tsx`](file:///c:/Coding/Wind%20Resource%20Manager/frontend/src/components/Sidebar.tsx)) e cabeçalho ([`Header.tsx`](file:///c:/Coding/Wind%20Resource%20Manager/frontend/src/components/Header.tsx)).
  - Sub-abas completas em `frontend/src/components/metmast/`: **Dados & Sensores** (`MetMastDataTab`), **Controle de Qualidade** (`MetMastQCTab`), **Análises Eólicas** (`MetMastAnalysisTab` com Rosa dos Ventos, Wind Shear Power/Log Law, Turbulência IEC 61400-1 Classes A/B/C, Matriz `12x24` e Weibull MLE) e **Exportação** (`MetMastExportTab` para WAsP `.tab`, CSV tratado pós-QC e ponte direta de coordenadas para `Reanálises - Manual`).
- **Documentação & Testes Automatizados**:
  - Atualizado [`MethodologyView.tsx`](file:///c:/Coding/Wind%20Resource%20Manager/frontend/src/components/MethodologyView.tsx) cobrindo QC anemométrico, cisalhamento vertical e turbulência IEC 61400-1 com referências acadêmicas.
  - Adicionada suíte completa de testes em [`tests/test_met_mast.py`](file:///c:/Coding/Wind%20Resource%20Manager/tests/test_met_mast.py).

---

## [1.6.0] - 2026-09-07

### ✨ Módulo "Reanálises - Manual" & Extrapolação Espacial Vetorial Horizontal (Padrão Vortex FdC)
- **Novo Módulo Independente "Reanálises - Manual" & Renomeação para "Reanálises - ONS"**:
  - Eliminação da dependência exclusiva de seleção de conjuntos eólicos do ONS para obtenção de reanálises históricas de 30 anos.
  - Navegação lateral na [`Sidebar.tsx`](file:///c:/Coding/Wind%20Resource%20Manager/frontend/src/components/Sidebar.tsx) atualizada com os módulos dedicados: **"Reanálises - ONS"** e **"Reanálises - Manual"**.
  - Novo seletor [`ManualCoordinatesSelector.tsx`](file:///c:/Coding/Wind%20Resource%20Manager/frontend/src/components/ManualCoordinatesSelector.tsx) com campos numéricos de Latitude, Longitude, Nome do Ponto/Mastro, presets geográficos e seleção de janela temporal de análise.
  - **Interatividade Total com o Mapa Leaflet**: O usuário pode clicar diretamente em qualquer ponto do mapa para reposicionar as coordenadas do ponto alvo e calcular imediatamente os 4 nós mais próximos de ERA5 e MERRA-2.
- **Extrapolação Espacial Vetorial Horizontal (Padrão Vortex FdC - Vortex SERIES)**:
  - Disponível como opção para **ambos os módulos** ("Reanálises - ONS" extrapolando até a SE Coletora do parque e "Reanálises - Manual" extrapolando até a coordenada definida pelo usuário). **Desativada por padrão**, conforme solicitação.
  - Implementação completa em [`src/analytics/spatial_interpolation.py`](file:///c:/Coding/Wind%20Resource%20Manager/src/analytics/spatial_interpolation.py) seguindo as melhores práticas mundiais da *Vortex Factoria de Calculs* (https://vortexfdc.com/):
    1. Decomposição horária dos ventos de cada um dos 4 nós da grade em componentes ortogonais: zonal ($u = -S \cdot \sin(\theta)$) e meridional ($v = -S \cdot \cos(\theta)$), impedindo anomalias de média escalar angular (ex: ventos de 359° e 1° resultando em 180°);
    2. Ponderação pelo Inverso da Distância Ponderada Geodésica esférica ($IDW$ com $p=2$);
    3. Interpolação espacial independente das componentes vetoriais $u$ e $v$;
    4. Reconstituição física vetorial da velocidade e direção do vento na coordenada alvo ($V = \sqrt{u^2 + v^2}$ e $\theta = \text{atan2}(-u, -v)$);
    5. Interpolação das variáveis meteorológicas de superfície (temperatura a 2m, vento a 10m e pressão atmosférica).
- **Comparativo Pré-Extrapolação e Card Interativo**:
  - Criado o componente [`VortexExtrapolationCard.tsx`](file:///c:/Coding/Wind%20Resource%20Manager/frontend/src/components/VortexExtrapolationCard.tsx), permitindo ao usuário comparar as distâncias e pesos dos nós mais próximos de ERA5 versus MERRA-2 antes de escolher o modelo base da extrapolação.
  - Botão de execução sob demanda que baixa eventuais nós faltantes, calcula as séries horárias, salva em arquivo Parquet colunar e registra no catálogo DuckDB (`data/reanalysis/vortex_{model}_{lat}_{lon}_{years}.parquet`).
  - Alternador de visualização (Toggle) que permite trocar entre o **Ponto Extrapolado (Sintetizado)** e os **Nós Individuais da Grade**, com atualização dinâmica de todos os gráficos (Séries Temporais, Rosa dos Ventos, Weibull, Perfis Diurnos/Sazonais, MCP) e exportação em CSV/Parquet.
- **Endpoints de Backend & Testes**:
  - Adicionado `GET /api/reanalysis/nodes-by-coords` para consulta de nós a partir de coordenadas avulsas.
  - Adicionado `POST /api/reanalysis/interpolate` para sintetizar a série temporal vetorial.
  - Atualizadas rotas `/timeseries`, `/analytics`, `/correlation`, `/export/csv` e `/export/parquet` para suportar séries sintéticas `VORTEX-*`.
  - Adicionados testes unitários automatizados em `tests/test_backend.py` validando os endpoints e a trigonometria vetorial física.

---

## [1.5.0] - 2026-09-07

### ✨ Persistência Incremental Mês a Mês & Decomposição Multi-Usina com Flag de Vento Inválido
- **Catálogo de Reanálise Persistente em DuckDB & Download Incremental Mês a Mês**:
  - Criado o catálogo `data/reanalysis_catalog.duckdb` gerenciado por `src/database/reanalysis_catalog.py`, registrando metadados de todos os nós de reanálise já processados (modelo, nó, coordenadas, intervalo temporal `min_timestamp` e `max_timestamp`, registros, caminho e tamanho).
  - Implementada sincronização incremental inteligente em [`src/etl/era5_client.py`](file:///c:/Coding/Wind%20Resource%20Manager/src/etl/era5_client.py) e [`src/etl/merra2_client.py`](file:///c:/Coding/Wind%20Resource%20Manager/src/etl/merra2_client.py): quando o usuário acessa um conjunto cujo nó de reanálise já possui base histórica (ex: 30 anos), o sistema detecta a data máxima existente e baixa **apenas o delta do novo mês** (~744 horas em vez de 268.800 horas), concatenando e salvando sem redundância em menos de 1 segundo.
- **Decomposição por Usina Física (`nom_usina`) no Conjunto Eólico**:
  - Esclarecida a granularidade do ONS EOL Detailed: um conjunto eólico (ex: *Caetité 123*) é composto por $N$ usinas físicas (ex: *Caetité 1*, *Caetité 2*, *Caetité 3*), cada qual com anemômetros próprios em suas turbinas.
  - Implementado endpoint `GET /api/reanalysis/plants` e suporte em `fetch_ensemble_measured_series`, permitindo consultar tanto a média ponderada do conjunto quanto cada usina individualmente.
  - Em [`TimeSeriesChart.tsx`](file:///c:/Coding/Wind%20Resource%20Manager/frontend/src/components/TimeSeriesChart.tsx), cada usina individual é plotada com cores distintas e linhas tracejadas, além da curva principal em verde esmeralda.
  - Em [`LinearCorrelationChart.tsx`](file:///c:/Coding/Wind%20Resource%20Manager/frontend/src/components/LinearCorrelationChart.tsx), foi adicionado um seletor de usinas (`Usina: [ Média do Conjunto | Caetité 1 | Caetité 2 | ... ]`), permitindo calibrar o modelo MCP para usinas específicas do parque.
- **Eixo Y Secundário para Taxa de Dado de Vento Inválido (`flg_dadoventoinvalido`)**:
  - Adicionado eixo Y direito secundário (0% a 100%) no gráfico de séries temporais para plotar `flg_dadoventoinvalido` (indicador de falha/congelamento/defeito no anemômetro do aerogerador reportado ao ONS).
  - Exibição como histograma de barras verticais semitransparentes em vermelho coral (`#f43f5e`), permitindo auditar a confiabilidade do sinal de vento medido sem poluir as curvas de velocidade em m/s.

---

## [1.4.1] - 2026-09-07

### ✨ Resoluções Semanal e Mensal na Correlação Linear MCP
- **Adição de Agrupamentos Semanal e Mensal**:
  - Implementado suporte completo para agregação **Semanal** (`weekly`) e **Mensal** (`monthly`) na rota `/api/reanalysis/correlation` e no componente [`LinearCorrelationChart.tsx`](file:///c:/Coding/Wind%20Resource%20Manager/frontend/src/components/LinearCorrelationChart.tsx).
  - O agrupamento mensal segue o padrão clássico da indústria eólica para estudos de certificação P50/P90 de longo prazo (Measure-Correlate-Predict).
  - No conjunto Caetité 123 (BA), a correlação semanal alcança **$R = 0.9561$** ($R^2 = 91.42\%$, $N = 192$ semanas) e a correlação mensal atinge impressionantes **$R = 0.9636$** ($R^2 = 92.85\%$, $N = 44$ meses).
- **Compatibilização de Dispersão no Frontend**:
  - Ajustado mapeamento de pontos de dispersão em [`LinearCorrelationChart.tsx`](file:///c:/Coding/Wind%20Resource%20Manager/frontend/src/components/LinearCorrelationChart.tsx) para suportar tanto vetores `[x, y, data]` quanto objetos, assegurando renderização perfeita em qualquer cenário.

---

## [1.4.0] - 2026-09-07

### ✨ Auto-Download da Reanálise Mais Próxima, Dados Medidos ONS & Correlação MCP
- **Download Automático da Reanálise Mais Próxima**:
  - Ao selecionar qualquer conjunto eólico na lista de empresas/conjuntos, o sistema calcula a distância física exata entre a SE Coletora e os 8 nós circundantes (4 de ERA5 e 4 de MERRA-2).
  - O nó com menor distância física é selecionado por padrão e, se ainda não estiver em cache local, o download dos 30 anos de reanálise é iniciado automaticamente em segundo plano.
- **Inteligência Smart Curtailment: Ingestão de Dados Medidos ONS (EOL Detailed)**:
  - Integração com o dataset de restrição eólica detalhada do ONS (`restricao_coff_eolica_detail` / `val_ventoverificado`), abrangendo o histórico de medições reais de anemômetros nos aerogeradores (desde janeiro de 2023 até o mês presente).
  - Engine de alta performance com DuckDB e Polars indexando o catálogo e gerando cache local por conjunto em `data/ons_eolica_detail/cache/` (consulta em <7ms).
  - No gráfico de Série Temporal Completa ([`TimeSeriesChart`](file:///c:/Coding/Wind%20Resource%20Manager/frontend/src/components/TimeSeriesChart.tsx)), a velocidade real medida pela usina é plotada lado a lado com a reanálise (linha verde esmeralda com indicador pulsante).
- **Módulo e Aba Dedicada: Correlação Linear MCP (Measure-Correlate-Predict)**:
  - Nova aba interativa **"Correlação MCP (Reanálise vs Usina)"** com componente dedicado [`LinearCorrelationChart`](file:///c:/Coding/Wind%20Resource%20Manager/frontend/src/components/LinearCorrelationChart.tsx).
  - Suporte à resolução concomitante **Horária** e **Diária** (esta última suaviza variações de micro-escala, elevando a correlação para patamares superiores a 90%).
  - Exibição de cards com métricas estatísticas essenciais: Coeficiente de Correlação de Pearson ($R$), Coeficiente de Determinação ($R^2$), Equação do Modelo Linear ($V_{med} = a \cdot V_{rean} + b$), Bias médio ($V_{med} - V_{rean}$), Incerteza (RMSE e MAE) e contagem de amostras emparelhadas.
  - Gráfico de dispersão bidimensional (Scatter Plot) interativo via ECharts com a reta de regressão ajustada e linha 1:1 de referência ideal ($y = x$).

---

## [1.3.4] - 2026-09-07

### 🐛 Correções & Conectores de Reanálise (ERA5 & MERRA-2)
- **Correção da Ação "Recarregar Série" com Forçamento de Download (`force: isReload`)**:
  - Quando o usuário clicava em "Recarregar Série" em nós já em cache, o frontend enviava `force: false`. O backend encontrava o arquivo local existente e retornava imediatamente sem consultar a API externa. Agora, ao clicar em "Recarregar Série", `force: true` é enviado expressamente, permitindo recarregar e sobrescrever os dados com novas séries completas.
  - Ao clicar no botão de baixar/recarregar na tabela de nós, o nó clicado é automaticamente selecionado (`setSelectedNode(node)`), permitindo que os gráficos de séries temporais e estatísticas reflitam imediatamente a série processada.
  - Adicionado indicador visual de carregamento (`Loader2` com texto dinâmico *"Recarregando..."* / *"Baixando..."*) diretamente no botão do card do nó em processamento.
- **Eliminação de Falsos Positivos de Cache (`is_cached`)**:
  - Corrigido bug em [`src/api/routes/reanalysis.py`](file:///c:/Coding/Wind%20Resource%20Manager/src/api/routes/reanalysis.py) onde o padrão glob `era5_{clean_id}_*.parquet` verificava apenas o identificador relativo (ex: `ERA5_NW`) sem as coordenadas geográficas. Isso fazia com que todos os parques do Brasil marcassem nós como "em cache" se houvesse qualquer arquivo salvo com o mesmo quadrante.
  - O padrão foi corrigido para `era5_*_{latitude:.4f}_{longitude:.4f}_*.parquet`, garantindo que o status de cache seja verificado exclusivamente nas coordenadas exatas daquele ponto de grade.
- **Resolução do Erro HTTP 422 na API da NASA POWER (MERRA-2)**:
  - A API horária da NASA POWER inicia seus registros obrigatoriamente a partir de **01/01/2001**. Requisições para anos anteriores (ex: 1996 a 2000) resultavam em erro `HTTP 422: Your start date out of range. The data starts at 2001/01/01`.
  - Ajustado [`src/etl/merra2_client.py`](file:///c:/Coding/Wind%20Resource%20Manager/src/etl/merra2_client.py) para travar a data mínima de requisição horária em `20010101`, pulando blocos anteriores e garantindo download estável de 2001 a 2026 (~4 MB Parquet com vento a 100m extrapolado via cisalhamento e 10m).

---

## [1.3.3] - 2026-09-07

### 🚀 Experiência do Desenvolvedor & Operação (Scripts BAT)
- **Criação do `Fechar_Wind_Resource_Manager.bat`**:
  - Script batch com 1 clique para encerrar com segurança todos os serviços e processos da aplicação.
  - Detecta e mata processos nas portas `8000` (FastAPI / Python) e `5173` (Vite / Node), evitando conflito de "Port already in use".
  - Fecha as janelas do terminal CMD associadas e fecha a si mesmo suavemente.
- **Unificação e Limpeza da Raiz**:
  - Mantidos na raiz do projeto apenas **2 scripts essenciais**:
    1. [`Iniciar_Wind_Resource_Manager.bat`](file:///c:/Coding/Wind%20Resource%20Manager/Iniciar_Wind_Resource_Manager.bat) (Inicia Backend, Frontend e abre navegador).
    2. [`Fechar_Wind_Resource_Manager.bat`](file:///c:/Coding/Wind%20Resource%20Manager/Fechar_Wind_Resource_Manager.bat) (Encerra tudo com 1 clique).
  - Os scripts auxiliares de desenvolvimento isolado (`Iniciar_Backend.bat` e `Iniciar_Frontend.bat`) foram organizados na pasta `scripts/dev/` com caminhos relativos robustos (`%~dp0`), eliminando a confusão de múltiplos executáveis de inicialização na raiz.

---

## [1.3.2] - 2026-09-07

### ✨ Adicionado & Melhorado
- **Ordenação Alfabética Estrita no Filtro de Empresas (A a Z)**:
  - **Hierarquia com Prioridade na Empresa**: No seletor de empresas, a ordenação foi ajustada para priorizar a razão social da empresa (`nom_agenteoperador`) em ordem alfabética (A a Z), abandonando o critério anterior que priorizava potência instalada em MW ou quantidade de conjuntos.
  - **Backend ONS DuckDB**: Em [`src/etl/ons_catalog.py`](file:///c:/Coding/Wind%20Resource%20Manager/src/etl/ons_catalog.py), o método `list_companies()` foi alterado para ordenar por `UPPER(TRIM(nom_agenteoperador)) ASC`, garantindo que `/api/catalog/companies` retorne a relação completa em ordem alfabética exata.
  - **Frontend Resiliente com `localeCompare`**: Em [`CompanySelector.tsx`](file:///c:/Coding/Wind%20Resource%20Manager/frontend/src/components/CompanySelector.tsx) e [`App.tsx`](file:///c:/Coding/Wind%20Resource%20Manager/frontend/src/App.tsx), adicionada ordenação com `localeCompare('pt-BR', { sensitivity: 'base' })` para tratamento impecável de acentos, caracteres especiais (Ç, Ã, etc.) e maiúsculas/minúsculas.
  - **Ordenação dos Conjuntos da Empresa Selecionada**: Em [`EnsembleSelector.tsx`](file:///c:/Coding/Wind%20Resource%20Manager/frontend/src/components/EnsembleSelector.tsx), os conjuntos pertencentes à empresa selecionada são ordenados alfabeticamente por nome (`nom_usina_conjunto`).
  - **Testes Automatizados**: Adicionada asserção no teste `test_catalog_and_api` em [`tests/test_backend.py`](file:///c:/Coding/Wind%20Resource%20Manager/tests/test_backend.py) validando que as empresas são retornadas sempre ordenadas alfabeticamente.

---

## [1.3.1] - 2026-09-07

### 🐛 Correções & Resiliência
- **Resolução do Erro HTTP 429 ("Too Many Requests") no Download de Séries Temporais**:
  - **Fator Causa 1 (Disparos Concorrentes Não Solicitados)**: Os endpoints `/api/reanalysis/timeseries` e `/api/reanalysis/analytics` disparavam automaticamente download em segundo plano quando um nó não estava em cache. Ao clicar simultaneamente no botão de download, múltiplos downloads paralelos eram enviados para a API do Open-Meteo para a mesma coordenada. Ajustado para retornar resposta vazia limpa (HTTP 200) quando o arquivo ainda não existir, reservando o download exclusivamente para a ação explícita do usuário.
  - **Fator Causa 2 (Otimização de Chunks & Clamping de Datas Futuras)**: A janela de 30 anos foi consolidada de chunks de 5 anos (7 requisições sucessivas) para **chunks de 10 anos** (apenas 3 requisições). A data final foi travada para nunca solicitar datas futuras (ex: fim de 2026), evitando erros de rejeição e esgotamento de quota de burst da API.
  - **Fator Causa 3 (Backoff Exponencial & Concorrência Thread-Safe)**: Implementado mecanismo de retry com *exponential backoff* e respeito ao cabeçalho `Retry-After` para os clientes ERA5 e MERRA-2, além de trava de sincronização (`threading.Lock`) por nó e intervalo de cortesia de 1.2s entre chunks.
  - **Correção Polars 1.x**: Corrigido erro de construção de DataFrames com `pl.lit()` dentro do construtor `pl.DataFrame()`, substituído por listas nativas Python de alta velocidade.

---

## [1.3.0] - 2026-09-07

### ✨ Adicionado & Melhorado
- **Precisão Mensal (Formato Ano-Mês: AAAA-MM)**:
  - O seletor de período agora exibe e permite manipulação no formato **Ano-Mês** (ex: `1996-08` até `2026-08`), abandonando a simplificação estrita de anos-calendário fechados.
  - Como acervos de reanálise são publicados continuamente mês a mês (raramente coincidindo com 31 de dezembro), a janela de 30 anos agora calcula exatamente **360 meses emparelhados** a partir do mês limite disponível.
  - Implementada a função [`filter_df_by_period`](file:///c:/Coding/Wind%20Resource%20Manager/src/etl/date_range_checker.py) no backend para recorte exato por timestamp nas séries temporais, gráficos e estatísticas de Weibull/Rosa dos Ventos.
  - Adicionado suporte a `start_month` e `end_month` em todas as rotas da API (`/api/reanalysis/timeseries`, `/api/reanalysis/analytics`, `/api/reanalysis/download`, `/api/export/csv`).
  - No frontend, os inputs de período utilizam formato `AAAA-MM` com largura proporcional, validação de caracteres e restauração do período padrão com cálculo dinâmico da quantidade de anos (`{y} Anos`).
  - Indicador do modelo balizador atualizado para exibir o mês de referência: `Emparelhado: Ref MERRA-2 (2026-08)`.
  - Exportação e Dossiê sincronizados com a janela exata de meses selecionada.

---

## [1.2.0] - 2026-09-07

### ✨ Adicionado & Melhorado
- **Emparelhamento Dinâmico de 30 Anos Baseado no Modelo Mais Defasado**:
  - Implementado o módulo [`date_range_checker.py`](file:///c:/Coding/Wind%20Resource%20Manager/src/etl/date_range_checker.py) que consulta em tempo real a data de atualização mais recente dos acervos ERA5 (ECMWF via Open-Meteo) e MERRA-2 (NASA POWER).
  - Regra de Negócio de Emparelhamento: identifica dinamicamente qual dos dois modelos possui o dado mais defasado/desatualizado (`min(data_era5, data_merra2)`) e adota essa data como a âncora final comum, retroagindo exatamente 30 anos dali para trás.
  - Exemplo prático detectado: ERA5 atualizado até setembro/2026 e MERRA-2 atualizado até 30/08/2026. O sistema trava a referência no MERRA-2 e define a janela emparelhada de 30 anos (1996 a 2026).
  - Adicionado endpoint `GET /api/reanalysis/date-range` com cache em memória de 6 horas para alta performance.
  - No frontend, o seletor *"Período (30 Anos)"* inicializa automaticamente com os anos calculados dinamicamente pela API, exibe badge com o modelo balizador (`Ref MERRA-2`) e oferece botão de restauração rápida (`Padrão`).

---

## [1.1.0] - 2026-09-07

### ✨ Adicionado & Melhorado
- **Correção de Sobreposição dos Filtros (Z-Index)**:
  - Adicionado contexto de empilhamento isolado (`isolation: isolate`) na malha do mapa Leaflet para nunca sobrepor dropdowns.
  - Implementado backdrop invisível fixo (`z-[100]`) e menus suspensos com `z-[110]` em `CompanySelector.tsx` e `EnsembleSelector.tsx`.
- **Mapa Gratuito e Aberto (Sem "API KEY REQUIRED")**:
  - Substituição dos tiles antigos da CartoDB pelo **OpenStreetMap Padrão** (`tile.openstreetmap.org`), 100% gratuito e sem necessidade de chave de API.
  - Adicionado seletor de camadas no mapa com suporte a **Dark Mode (OSM estilizado)** e **Satélite HD Esri** (`World_Imagery`), permitindo visualizar os aerogeradores do parque eólico do espaço com zero custo.
- **Seletor de Tema Light / Dark**:
  - Implementada pílula no cabeçalho com botões Claro (Sun) e Escuro (Moon) no mesmo padrão do *Smart Curtailment*.
  - Persistência no `localStorage` sob a chave `wrm_theme` e classes sincronizadas no `documentElement` e `body`.
- **Limpeza do Cabeçalho**:
  - Remoção das 2 pílulas da direita (*"Catálogo ONS"* e *"Cloud Run & Vercel Ready"*) para um design mais limpo e focado.
- **Painel de Navegação à Esquerda (Sidebar)**:
  - Adicionado menu lateral responsivo no estilo *Smart Curtailment* com link profissional, assinatura *"By: Carlos Bogarin"* e 4 módulos dedicados:
    1. **Reanálises**: Módulo analítico principal (Malhas ERA5 & MERRA-2, Séries de 30 Anos, Rosa dos Ventos, Weibull e FC ONS).
    2. **Catálogo ONS**: Tabela interativa com todos os conjuntos eólicos do Brasil, filtros por UF e capacidade em MW.
    3. **Dossiê & Exportação**: Resumo executivo com botões de download direto em CSV e Parquet.
    4. **Metodologia**: Documentação das formulações matemáticas (Haversine, IDW, Weibull e cisalhamento do vento).

---

## [1.0.0] - 2026-09-07

### ✨ Adicionado (Lançamento Inicial)
- Catálogo eólico ONS cruzando `FATOR_CAPACIDADE`, `RELACIONAMENTO_USINA_CONJUNTO` e `CAPACIDADE_GERACAO`.
- Motor geodésico para cálculo dos 4 nós mais próximos de ERA5 (0,25°) e MERRA-2 (0,5° x 0,625°).
- Conectores sob demanda para séries temporais de 30 anos (Open-Meteo ERA5 e NASA POWER MERRA-2).
- Dashboard em React 19 + TypeScript + Vite + Tailwind CSS com Apache ECharts e Leaflet.
- Scripts de inicialização Windows (.bat), Dockerfile para Google Cloud Run e suporte a Vercel.