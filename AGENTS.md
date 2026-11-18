# AGENTS.md — Instruções Oficiais do Projeto Wind Resource Manager

Este arquivo é a **fonte única de instruções** para qualquer agente de IA atuando neste repositório.

---

## 1. Idioma, Comunicação e Formatação no Chat (Obrigatório)
- **Chat e respostas:** responda **sempre** em Português do Brasil (pt-BR).
- **Comentários e docstrings:** todos os comentários, docstrings e explicações no código (Python, TypeScript, SQL, etc.) devem ser escritos em Português do Brasil (pt-BR).
- **Documentação e commits:** toda documentação, logs do sistema e mensagens de commit devem usar Português (pt-BR).
- **Formatação no chat (sem LaTeX):** responda sempre no chat sem usar fórmulas em LaTeX (`$` ou `$$`) e sem caracteres especiais desnecessários. Escreva fórmulas em texto puro ou código simples e prefira listas com marcadores (`-`) a tabelas complexas.

---

## 2. Estrutura Obrigatória do Projeto e Higiene de Código

```text
Wind Resource Manager/
├── .agent/rules/                 # Regra única apontando para AGENTS.md
├── AGENTS.md                     # Fonte única de regras para IAs
├── CLAUDE.md                     # Apontador para AGENTS.md
├── GEMINI.md                     # Apontador para ./AGENTS.md
├── README.md                     # Documentação principal do projeto
├── CHANGELOG.md                  # Histórico SemVer de versões
├── Dockerfile                    # Imagem de produção (Cloud Run)
├── .dockerignore
├── .gitignore
├── pytest.ini
├── ruff.toml
├── requirements.txt
├── Iniciar_Wind_Resource_Manager.bat
├── Fechar_Wind_Resource_Manager.bat
├── docs/                         # Documentação complementar para humanos
├── scripts/dev/                  # Scripts auxiliares de desenvolvimento
├── src/                          # Pacote backend Python (imports `from src...`)
│   ├── paths.py                  # Fonte única de caminhos do projeto
│   ├── analytics/
│   ├── api/
│   ├── core/
│   ├── database/
│   └── etl/
├── frontend/                     # Interface React + TypeScript + Vite + Tailwind
├── data/                         # Catálogo versionado e caches/bancos locais
└── tests/                        # Suíte Pytest (com tests/conftest.py)
```

Regras obrigatórias de organização:
- **Nada de código solto na raiz:** módulos Python pertencem exclusivamente a `src/`, testes a `tests/`, scripts auxiliares a `scripts/` e guias auxiliares a `docs/`. Na raiz permanecem apenas os documentos centrais, arquivos exigidos por ferramentas e os `.bat` de uso diário.
- **Fonte única de caminhos (`src/paths.py`):** nenhum outro módulo deve montar caminho com `__file__` nem manter caminhos soltos; importe sempre de `src.paths` (ou via `settings` em `src.core.config`).
- **Não deixar arquivos, rotas ou estilos sem uso:** ao substituir ou descontinuar qualquer funcionalidade, remova imediatamente o arquivo, componente, rota, schema, tipo ou regra CSS/Tailwind antiga.
- **Arquivos temporários ficam fora do projeto:** nunca deixe arquivos de rascunho, logs, saídas manuais ou sobras de teste no repositório; testes automatizados devem usar diretórios temporários isolados (`tmp_path`).

---

## 3. Compatibilidade Multi-Ambiente Obrigatória (Localhost, Vercel & Google Cloud Run)
Toda alteração de código, rota de API, variável de ambiente, build de frontend ou lógica de backend deve manter compatibilidade simultânea nos 3 ambientes:

1. **Ambiente Local (Windows / Localhost):**
   - Backend em `http://127.0.0.1:8000` via Uvicorn / scripts `.bat` (`Iniciar_Wind_Resource_Manager.bat`).
   - Frontend em `http://localhost:5173` via Vite com proxy `/api`.
   - Compatibilidade de caminhos no Windows (barras, codificação UTF-8 e chamadas assíncronas).
2. **Frontend em Produção (Vercel):**
   - Build estático com Vite e TypeScript (`tsc -b && vite build`, `Root Directory = frontend`) sem erros de tipagem.
   - Comunicação com o backend em nuvem via `VITE_API_URL` (Google Cloud Run).
   - Tratamento de CORS, headers HTTPS e resiliência a cold-starts de API.
3. **Backend em Produção (Google Cloud Run / Docker):**
   - Contêiner Linux Docker com porta dinâmica `$PORT` (padrão `8080`).
   - Fuso horário fixado em `America/Sao_Paulo` (Horário de Brasília, UTC-3).
   - Inicialização rápida (< 2s) sem travar a porta HTTP para aprovação de startup probes.
   - Motor analítico DuckDB sobre arquivos Parquet com multithreading.

---

## 4. Padrões de Código e Arquitetura
- **Python (Backend):**
  - Python 3.12+ com tipagem estática rigorosa (type hints) e imports de pacote (`from src...`).
  - Código formatado e validado pelo `ruff` conforme `ruff.toml`.
  - Framework FastAPI com modelos Pydantic v2.
  - Banco de dados / Data Lake: DuckDB + Polars sobre arquivos Parquet.
- **Frontend:**
  - React 18 (`^18.3.1`) com TypeScript e Vite.
  - Estilização via Tailwind CSS com suporte aos temas escuro (Slate/Zinc) e claro.
  - Gráficos interativos via Apache ECharts (`echarts-for-react`).
  - Mapas interativos via Leaflet com marcação da SE Coletora e nós de reanálise ERA5 e MERRA-2.
  - Gerenciamento de estado assíncrono e cache com TanStack React Query.

---

## 5. Como Iniciar o App, Rodar Testes e Validar Lint
- **Atalhos diários (Windows):** `Iniciar_Wind_Resource_Manager.bat` (sobe backend `:8000` e frontend `:5173`) e `Fechar_Wind_Resource_Manager.bat`.
- **Backend manual:** `.\.venv\Scripts\python.exe -m uvicorn src.api.main:app --host 127.0.0.1 --port 8000 --reload`
- **Frontend manual:** `cd frontend` e `npm.cmd run dev` (build de produção: `npm.cmd run build`)
- **Testes automatizados:** `.\.venv\Scripts\python.exe -m pytest tests/ -v`
- **Lint Python:** `.\.venv\Scripts\ruff.exe check src tests`

---

## 6. Versionamento, Changelog e Governança (Obrigatório em todo Push)
- Atualização obrigatória de `CHANGELOG.md` em todo push com versão SemVer, data e descrição das alterações.
- Manutenção contínua do `README.md` (visão geral, arquitetura e instruções de deploy) e de `docs/COMO_SUBIR_GITHUB.md` alinhados à estrutura vigente.
