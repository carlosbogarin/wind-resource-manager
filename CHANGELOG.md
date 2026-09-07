# Changelog - Wind Resource Manager

Todas as alterações notáveis neste projeto serão documentadas neste arquivo.
O formato é baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/)
e este projeto adere ao [Semantic Versioning](https://semver.org/lang/pt-BR/).

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