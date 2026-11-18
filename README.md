# Wind Resource Manager 🌪️⚡

**Plataforma Unificada de Avaliação de Recurso Eólico: Reanálises de 30 Anos (ERA5 & MERRA-2), Catálogo ONS e Campanhas Anemométricas (Met Masts / LiDAR)**

O **Wind Resource Manager** é uma suíte analítica completa desenvolvida para engenharia de vento, operação e planejamento da geração eólica. O sistema integra geoprocessamento de dados regulatórios do Operador Nacional do Sistema Elétrico (ONS), malhas meteorológicas globais de reanálise **ERA5 (ECMWF)** e **MERRA-2 (NASA)** com correlação MCP (LLS & TLS), além de um módulo completo para tratamento e diagnóstico avançado de **Torres Anemométricas e LiDAR** alimentado pelo motor científico **BrightWind**.

---

## 🚀 Principais Módulos & Funcionalidades

1. **Reanálises - ONS & Catálogo Georreferenciado**:
   - Ingestão colunar automatizada cruzando `FATOR_CAPACIDADE`, `RELACIONAMENTO_USINA_CONJUNTO` e `CAPACIDADE_GERACAO` (150+ conjuntos eólicos e dezenas de GW catalogados em **Parquet**).
   - Matriz comparativa de correlação e ranking de séries vs medições reais das usinas ONS via algoritmos **LLS (Linear Least Squares)** e **TLS (Total Least Squares / Ortogonal)** à escolha do usuário.

2. **Reanálises - Manual & Motor Geodésico**:
   - Cálculo espacial dos **4 nós circundantes** da grade **ERA5** (0,25° x 0,25°, ~28 km) e **MERRA-2** (0,5° x 0,625°, ~50 km), distâncias Haversine, azimute e **Extrapolação Espacial Vetorial Horizontal (IDW)** diretamente para qualquer coordenada ou clique no mapa Leaflet.
   - Cache incremental em DuckDB + Parquet de séries horárias históricas de 30 anos.

3. **Torres Anemométricas & LiDAR (Motor BrightWind)**:
   - **Importação & Mapeamento**: Upload de campanhas `.csv`, `.txt`, `.dat` e `.tim` (CSV, Campbell Scientific CR1000, loggers tabulares) com detecção automática de cotas de altura, orientação de booms e matriz de disponibilidade (*coverage %*).
   - **Controle de Qualidade (QC)**: Motor de filtragem por limites físicos de velocidade, setor direcional de sombra de torre (*Mast Shadow*), gelo e estagnação de sensores, com visualização interativa comparativa e zoom.
   - **Análises Eólicas IEC**: Rosa dos Ventos (12/16 setores), Perfil de Cisalhamento Vertical (Power Law $\alpha$ e Log Law $z_0$ extrapolado ao cubo), Intensidade de Turbulência (TI) comparada às curvas **IEC 61400-1 NTM Classes A, B e C**, Matriz Diurna-Sazonal (`12x24`) e Distribuição de Weibull (MLE).
   - **Exportação**: Geração de arquivos `.tab` no padrão **WAsP**, exportação de CSV tratado pós-QC e integração direta de coordenadas com o módulo de reanálises.

4. **Metodologia & Rigor Normativo**:
   - Documentação interativa das formulações geodésicas, vetoriais, MCP (LLS & TLS), cisalhamento vertical e referências acadêmicas internacionais (WMO, IEC 61400-1, IEC 61400-12-1, MEASNET).

---

## 🛠️ Tecnologias Utilizadas

### Backend (Python 3.12)
- **FastAPI**: Framework assíncrono para construção de APIs REST de alta velocidade.
- **DuckDB**: Banco de dados analítico embarcado de processamento colunar ultrarrápido.
- **Polars & PyArrow**: Manipulação vetorial de dados temporais e armazenamento Parquet.
- **SciPy & NumPy**: Ajuste probabilístico da distribuição de Weibull e cálculos vetoriais.
- **Pydantic v2 & Pydantic-Settings**: Validação rigorosa de esquemas e variáveis de ambiente.
- **Ruff**: Linter e formatador de código de alta velocidade.

### Frontend (TypeScript + React 18)
- **Vite**: Bundler e servidor de desenvolvimento ultra-rápido.
- **Tailwind CSS**: Estilização moderna com Dark Mode profissional inspirado em dashboards de ponta.
- **Apache ECharts** (`echarts-for-react`): Motor gráfico de visualização com suporte a milhões de pontos.
- **Leaflet**: Mapas interativos vetoriais com CartoDB Dark Matter.
- **TanStack React Query**: Gerenciamento de estado, cache inteligente e revalidação de dados.
- **Lucide React**: Ícones SVG minimalistas.

---

## 📦 Como Executar Localmente (Windows)

### Iniciar a Aplicação:
Dê um duplo-clique no arquivo:
```
Iniciar_Wind_Resource_Manager.bat
```
Ele iniciará o Backend em `http://127.0.0.1:8000`, o Frontend em `http://localhost:5173` e abrirá seu navegador automaticamente.

### Fechar a Aplicação:
Dê um duplo-clique no arquivo:
```
Fechar_Wind_Resource_Manager.bat
```
Ele finaliza com segurança todos os processos do Backend (porta 8000) e Frontend (porta 5173), liberando as portas e fechando os terminais.

### Opção 2: Manualmente via Terminal

1. **Backend**:
   ```powershell
   .\.venv\Scripts\activate
   python -m uvicorn src.api.main:app --host 127.0.0.1 --port 8000 --reload
   ```
   - Swagger / Documentação: `http://127.0.0.1:8000/docs`

2. **Frontend**:
   ```powershell
   cd frontend
   npm.cmd run dev
   ```
   - Aplicação Web: `http://localhost:5173`

---

## 🧪 Testes Automatizados e Qualidade

Para rodar os testes unitários e de integração:
```powershell
.\.venv\Scripts\activate
python -m pytest tests/ -v
```

Para validar a qualidade do código com o Ruff:
```powershell
.\.venv\Scripts\activate
ruff check src tests
```

---

## 📁 Estrutura do Projeto

- `src/`: Pacote backend Python (`api/`, `analytics/`, `core/`, `database/`, `etl/`) com fonte única de caminhos em `src/paths.py`.
- `frontend/`: Aplicação web React 18 + TypeScript + Vite + Tailwind CSS.
- `data/`: Catálogo eólico versionado (`data/catalog/wind_catalog.parquet`) e caches/bancos locais.
- `docs/`: Documentação auxiliar para humanos (veja [COMO_SUBIR_GITHUB.md](docs/COMO_SUBIR_GITHUB.md)).
- `scripts/dev/`: Scripts auxiliares para iniciar backend ou frontend separadamente.
- `tests/`: Suíte de testes Pytest com `tests/conftest.py`.
- `AGENTS.md`: Fonte única de instruções para agentes de IA (`CLAUDE.md`, `GEMINI.md` e `.agent/rules/` apenas apontam para ele).

---

## ☁️ Deploy em Produção

### Backend: Google Cloud Run
O projeto possui um `Dockerfile` otimizado para contêineres Linux no Google Cloud Run:
```bash
gcloud run deploy wind-resource-manager \
    --source . \
    --region southamerica-east1 \
    --platform managed \
    --allow-unauthenticated \
    --memory 2Gi \
    --cpu 2
```

### Frontend: Vercel
1. Conecte o repositório GitHub ao Vercel.
2. Defina a pasta raiz do projeto como `frontend`.
3. Configure a variável de ambiente:
   - `VITE_API_URL`: URL do seu backend no Cloud Run (ex: `https://wind-resource-manager-xxx.run.app`).
4. O Vercel executará automaticamente `npm run build` e distribuirá na Edge Network global.