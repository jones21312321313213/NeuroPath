#!/bin/bash
set -e

echo "Applying database migrations..."
python manage.py migrate --noinput

echo "Collecting static files for WhiteNoise..."
python manage.py collectstatic --noinput

WORKERS=${GUNICORN_WORKERS:-3}
THREADS=${GUNICORN_THREADS:-2}
TIMEOUT=${GUNICORN_TIMEOUT:-120}

echo "Starting Gunicorn WSGI server ($WORKERS workers, $THREADS threads, timeout ${TIMEOUT}s)..."
exec gunicorn neuropath_core.wsgi:application \
    --bind 0.0.0.0:8000 \
    --workers "$WORKERS" \
    --threads "$THREADS" \
    --timeout "$TIMEOUT" \
    --access-logfile - \
    --error-logfile -
