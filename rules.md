# Regras de Desenvolvimento - Wind Resource Manager

## 1. Idioma e Comunicação (Obrigatório)
- **Chat e Respostas**: Responda **SEMPRE** em Português do Brasil (pt-BR).
- **Comentários de Código**: Todos os comentários, docstrings e explicações no código (Python, TypeScript, SQL, etc.) devem ser escritos **SEMPRE** em Português do Brasil (pt-BR).
- **Documentação e Commits**: Toda documentação, logs de sistema e mensagens de commit devem utilizar o idioma Português (pt-BR).

## 2. Compatibilidade Multi-Ambiente Obrigatória (Localhost, Vercel & Google Cloud Run)
Toda e qualquer alteração de código, endpoint, rota de API, variável de ambiente, build de frontend e lógica de backend DEVE ser pensada, implementada e testada garantindo compatibilidade simultânea e transparente em 3 ambientes:

1. **Ambiente Local (Windows / Localhost)**:
   - Backend rodando em `http://127.0.0.1:8000` via Uvicorn / scripts .bat (`Iniciar_Wind_Resource_Manager.bat`).
   - Frontend rodando em `http://localhost:5173` via Vite proxy `/api`.
   - Compatibilidade de caminhos no Windows (barras, codificação UTF-8 e chamadas assíncronas).

2. **Frontend em Produção (Vercel)**:
   - Build estático com Vite e TypeScript (`tsc -b && vite build`) sem erros de tipagem.
   - Comunicação com o backend em nuvem via `VITE_API_URL` (Google Cloud Run).
   - Tratamento de CORS, headers HTTPS e resiliência a cold-starts de API.

3. **Backend em Produção (Google Cloud Run / Docker)**:
   - Contêiner Linux Docker com porta dinâmica `` (padrão `8080`).
   - Fuso horário fixado em **`America/Sao_Paulo` (Horário de Brasília, UTC-3)**.
   - Inicialização rápida (< 2s) sem travar a porta HTTP para aprovação de startup probes.
   - Motor analítico **DuckDB** sobre arquivos Parquet com multithreading.

## 3. Padrões de Código e Arquitetura
- **Python (Backend)**:
  - Python 3.12+ com tipagem estática rigorosa (type hints).
  - Código formatado e validado pelo ruff.
  - Framework Backend: **FastAPI** com modelos **Pydantic v2**.
  - Banco de Dados / Data Lake: **DuckDB** + **Polars** sobre arquivos Parquet.
- **Frontend**:
  - **React 19** com **TypeScript** e **Vite**.
  - Estilização via **Tailwind CSS** com tema escuro moderno (Dark Mode Slate/Zinc).
  - Gráficos interativos via **Apache ECharts** (`echarts-for-react`).
  - Mapas interativos via **Leaflet** com marcação da SE Coletora e nós de reanálise ERA5 e MERRA-2.
  - Gerenciamento de estado assíncrono e cache com **TanStack React Query**.

## 4. Versionamento, Changelog e Governança de Documentação (Obrigatório em todo Push)
- Atualização obrigatória de `CHANGELOG.md` em todo push com versão, data e descrição das alterações.
- Manutenção do `README.md` com visão geral, arquitetura e instruções de deploy.

## 5. Formatação de Respostas no Chat (Sem LaTeX)
- Responda sempre no chat sem usar fórmulas em LaTeX ($ ou ) e sem caracteres especiais. Escreva fórmulas no chat em texto puro ou código simples e use listas com marcadores (-) em vez de tabelas complexas.
