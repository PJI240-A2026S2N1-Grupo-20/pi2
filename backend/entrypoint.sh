#!/bin/sh
set -e

echo "Aguardando o banco de dados em ${DB_HOST}:${DB_PORT}..."
until python -c "import socket, sys; s = socket.socket(); s.settimeout(1); s.connect(('${DB_HOST}', int('${DB_PORT}'))); s.close()" 2>/dev/null; do
    sleep 1
done
echo "Banco disponível."

echo "Aplicando migrações..."
python manage.py migrate --noinput

echo "Coletando arquivos estáticos..."
python manage.py collectstatic --noinput --clear

echo "Iniciando Gunicorn..."
exec gunicorn config.wsgi:application \
    --bind "0.0.0.0:${BACKEND_PORT:-8000}" \
    --workers "${GUNICORN_WORKERS:-3}" \
    --threads "${GUNICORN_THREADS:-2}" \
    --timeout "${GUNICORN_TIMEOUT:-60}" \
    --access-logfile - \
    --error-logfile -
