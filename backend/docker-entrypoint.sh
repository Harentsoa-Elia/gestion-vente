#!/bin/sh
set -e

HOST="${DB_HOST:-db}"
PORT="${DB_PORT:-5432}"
USER="${DB_USER:-postgres}"

echo "⏳ Waiting for database $HOST:$PORT..."

until nc -z "$HOST" "$PORT"; do
  sleep 2
done

echo "✅ Database ready !"

exec uvicorn main:app --host 0.0.0.0 --port 3136