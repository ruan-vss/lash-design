#!/usr/bin/env bash
# Restaura um backup: ./scripts/restore.sh backups/lash_YYYYMMDD_HHMMSS.sql.gz
# ATENÇÃO: apaga e recria o schema public do banco.
set -euo pipefail
cd "$(dirname "$0")/.."
[ $# -eq 1 ] || { echo "Uso: $0 <arquivo.sql.gz>"; exit 1; }
read -r -p "Isto SUBSTITUI todos os dados atuais. Digite 'restaurar' para continuar: " ok
[ "$ok" = "restaurar" ] || { echo "Cancelado."; exit 1; }
docker compose stop api web
docker compose exec -T db psql -U lash -d lash -v ON_ERROR_STOP=1 -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
gunzip -c "$1" | docker compose exec -T db psql -U lash -d lash -v ON_ERROR_STOP=1
docker compose start api web
echo "Restauração concluída."
