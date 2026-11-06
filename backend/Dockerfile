# syntax=docker/dockerfile:1

# ---------- Estágio 1: dependências ----------
FROM python:3.14-slim AS builder

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
        build-essential \
        libpq-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --prefix=/install -r requirements.txt

# ---------- Estágio 2: runtime ----------
FROM python:3.14-slim AS runtime

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    DJANGO_SETTINGS_MODULE=config.settings \
    BACKEND_PORT=8000

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
        libpq5 \
        curl \
    && rm -rf /var/lib/apt/lists/*

COPY --from=builder /install /usr/local

RUN useradd --create-home --shell /bin/bash appuser \
    && mkdir -p /app/staticfiles /app/media \
    && chown -R appuser:appuser /app

COPY --chown=appuser:appuser . .

RUN chmod +x /app/entrypoint.sh

USER appuser

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD curl -fsS http://localhost:8000/health/ || exit 1

ENTRYPOINT ["/app/entrypoint.sh"]
