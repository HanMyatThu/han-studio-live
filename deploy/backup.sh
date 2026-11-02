#!/bin/sh
# Nightly database backup. Add to crontab: 0 3 * * * /opt/zat/deploy/backup.sh
set -e
cd "$(dirname "$0")/.."
mkdir -p backups
docker compose exec -T db pg_dump -U zat zat | gzip > "backups/zat-$(date +%F).sql.gz"
find backups -name 'zat-*.sql.gz' -mtime +14 -delete
