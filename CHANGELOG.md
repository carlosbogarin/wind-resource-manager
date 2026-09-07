# Changelog - Wind Resource Manager

Todas as alterações notáveis neste projeto serão documentadas neste arquivo.
O formato é baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/)
e este projeto adere ao [Semantic Versioning](https://semver.org/lang/pt-BR/).

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