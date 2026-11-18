# ==============================================================================
# Dockerfile para Wind Resource Manager API (Google Cloud Run / Produção)
# ==============================================================================

FROM python:3.12-slim

WORKDIR /app

# Variáveis de ambiente para contêiner
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    MPLBACKEND=Agg \
    TZ=America/Sao_Paulo \
    PORT=8080

# Dependências essenciais do sistema e fuso horário
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    build-essential \
    tzdata \
    && ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone \
    && rm -rf /var/lib/apt/lists/*

# Instalar dependências Python
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Criar diretórios de dados
RUN mkdir -p data/catalog data/reanalysis data/raw data/met_mast/uploads data/met_mast/sessions

# Copiar catálogo compilado ONS e código-fonte
COPY data/catalog/ ./data/catalog/
COPY src/ ./src/

# Expor porta do Cloud Run
EXPOSE 8080

# Inicialização com suporte a porta dinâmica $PORT no Google Cloud Run
CMD ["sh", "-c", "uvicorn src.api.main:app --host 0.0.0.0 --port ${PORT:-8080}"]