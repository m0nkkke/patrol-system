#!/usr/bin/env sh
set -eu

APP_DIR="${APP_DIR:-/opt/patrol-system}"
BACKUP_DIR="${BACKUP_DIR:-/opt/patrol-backups/postgres}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"
ENV_FILE="${ENV_FILE:-.env.production}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"

cd "$APP_DIR"

if [ ! -f "$ENV_FILE" ]; then
  echo "Env file not found: $APP_DIR/$ENV_FILE" >&2
  exit 1
fi

set -a
. "./$ENV_FILE"
set +a

mkdir -p "$BACKUP_DIR"

timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
backup_path="$BACKUP_DIR/patrol-$timestamp.dump"

docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" exec -T postgres \
  pg_dump -U "$DATABASE_USER" -d "$DATABASE_NAME" -Fc > "$backup_path"

find "$BACKUP_DIR" -type f -name 'patrol-*.dump' -mtime +"$RETENTION_DAYS" -delete

echo "$backup_path"
