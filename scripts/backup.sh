#!/usr/bin/env bash
# Backup do PostgreSQL (dump comprimido). Agende no cron do servidor, ex.:
#   0 3 * * *  cd /opt/lash-saas && ./scripts/backup.sh >> backups/backup.log 2>&1
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p backups
FILE="backups/lash_$(date +%Y%m%d_%H%M%S).sql.gz"
docker compose exec -T db pg_dump -U lash -d lash --no-owner | gzip > "$FILE"
chmod 600 "$FILE"
# mantém os 14 backups mais recentes
ls -1t backups/lash_*.sql.gz | tail -n +15 | xargs -r rm --
echo "Backup criado: $FILE"
