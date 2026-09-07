# Changelog - Wind Resource Manager

Todas as alterações notáveis neste projeto serão documentadas neste arquivo.
O formato é baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/)
e este projeto adere ao [Semantic Versioning](https://semver.org/lang/pt-BR/).

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