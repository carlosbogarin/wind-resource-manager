# Wind Resource Manager 🌪️⚡

**Sistema Padrão Ouro para Gestão de Recursos Eólicos, Catalogação ONS e Reanálise Histórica de 30 Anos (ERA5 & MERRA-2)**

O **Wind Resource Manager** é uma plataforma analítica de alta performance desenvolvida para engenharia de vento, inteligência de mercado e planejamento da geração eólica no Brasil. O sistema correlaciona dados regulatórios e georreferenciados do Operador Nacional do Sistema Elétrico (ONS) com as malhas meteorológicas globais de reanálise **ERA5 (ECMWF)** e **MERRA-2 (NASA)**.

---

## 🚀 Principais Funcionalidades

1. **Catálogo Georreferenciado ONS de Parques Eólicos**:
   - Ingestão colunar automatizada cruzando:
     - `FATOR_CAPACIDADE`: coordenadas geodésicas da Subestação Coletora (`val_latitudesecoletora`, `val_longitudesecoletora`), potência e histórico mensal verificado.
     - `RELACIONAMENTO_USINA_CONJUNTO`: mapeia código ONS do conjunto (`CJU_...`) para o CEG das usinas.
     - `CAPACIDADE_GERACAO`: mapeia o CEG para a empresa operadora (`nom_agenteoperador`).
   - Mais de 150 conjuntos eólicos e dezenas de gigawatts catalogados com indexação colunar em **Parquet**.

2. **Motor Geodésico de Malhas de Reanálise**:
   - Cálculo espacial instantâneo dos **4 nós circundantes** da grade **ERA5** (0,25° x 0,25°, ~28 km) e **MERRA-2** (0,5° x 0,625°, ~50 km).
   - Cálculo de distâncias esféricas de grande círculo via fórmula de Haversine (km), azimute/direção cardeal e pesos de interpolação por inverso da distância ponderada (IDW).

3. **Download de Séries Temporais de 30 Anos sob Demanda**:
   - Conector oficial de alta velocidade para o acervo de reanálise histórica do **ERA5** (velocidade do vento a 100m e 10m, direção, pressão e temperatura desde 1940).
   - Conector **NASA POWER / MERRA-2** (velocidade do vento a 50m e 10m, extrapolação ao rotor via lei de potência de cisalhamento).
   - Cache colunar local em Parquet com zero re-download e tempo de resposta < 50ms.

4. **Visualização Gráfica Padrão Ouro (Apache ECharts & Leaflet)**:
   - **Mapa Interativo (Leaflet)**: Destaque da SE Coletora (marcador com pulso dinâmico), nós ERA5 (polígono ciano) e nós MERRA-2 (polígono âmbar) com popups de distância e clique rápido.
   - **Séries Temporais com Zoom**: Gráfico contínuo com slider `dataZoom`, alternância diária/mensal/horária e ferramentas de exportação.
   - **Rosa dos Ventos (16 Setores)**: Gráfico polar direcional com faixas de velocidade padronizadas e detecção automática do setor dominante.
   - **Distribuição de Weibull**: Histograma empírico comparado à curva de probabilidade teórica (cálculo de $k$, $c$ e velocidade média $V_{med}$).
   - **Perfil Diurno Médio**: Ciclo horário térmico (00h a 23h) com bandas percentílicas P10 e P90.
   - **Sazonalidade Mensal**: Regime anual dos ventos alísios e ciclo de safra eólica no Brasil.
   - **Correlação Real ONS**: Validação do vento reanalisado em relação ao Fator de Capacidade ($FC$) histórico verificado da usina.

5. **Exportação de Dados**:
   - Exportação em um clique em **CSV** e **Parquet** colunar.

---

## 🛠️ Tecnologias Utilizadas

### Backend (Python 3.12)
- **FastAPI**: Framework assíncrono para construção de APIs REST de alta velocidade.
- **DuckDB**: Banco de dados analítico embarcado de processamento colunar ultrarrápido.
- **Polars & PyArrow**: Manipulação vetorial de dados temporais e armazenamento Parquet.
- **SciPy & NumPy**: Ajuste probabilístico da distribuição de Weibull e cálculos vetoriais.
- **Pydantic v2 & Pydantic-Settings**: Validação rigorosa de esquemas e variáveis de ambiente.
- **Ruff**: Linter e formatador de código de alta velocidade.

### Frontend (TypeScript + React 19)
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
ruff check src/ tests/
```

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