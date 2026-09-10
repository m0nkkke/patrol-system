#!/usr/bin/env sh
set -eu

APP_DIR="${APP_DIR:-/opt/patrol-system}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"
ENV_FILE="${ENV_FILE:-.env.production}"
LOCK_FILE="${DEPLOY_LOCK_FILE:-/tmp/patrol-system-production-deploy.lock}"
HEALTH_ATTEMPTS="${HEALTH_ATTEMPTS:-30}"
HEALTH_INTERVAL_SECONDS="${HEALTH_INTERVAL_SECONDS:-2}"

fail() {
  echo "Deployment failed: $*" >&2
  exit 1
}

command -v docker >/dev/null 2>&1 || fail "docker is not installed"
docker compose version >/dev/null 2>&1 || fail "Docker Compose v2 is not available"
command -v flock >/dev/null 2>&1 || fail "flock is not installed"

case "$HEALTH_ATTEMPTS" in
  *[!0-9]*|'') fail "HEALTH_ATTEMPTS must be a positive integer" ;;
esac
case "$HEALTH_INTERVAL_SECONDS" in
  *[!0-9]*|'') fail "HEALTH_INTERVAL_SECONDS must be a positive integer" ;;
esac
[ "$HEALTH_ATTEMPTS" -gt 0 ] || fail "HEALTH_ATTEMPTS must be greater than zero"
[ "$HEALTH_INTERVAL_SECONDS" -gt 0 ] || fail "HEALTH_INTERVAL_SECONDS must be greater than zero"

cd "$APP_DIR"

[ -f "$COMPOSE_FILE" ] || fail "compose file not found: $APP_DIR/$COMPOSE_FILE"
[ -f "$ENV_FILE" ] || fail "environment file not found: $APP_DIR/$ENV_FILE"

exec 9>"$LOCK_FILE"
flock -n 9 || fail "another production deployment is already running"

compose() {
  docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" "$@"
}

show_service_logs() {
  service="$1"
  compose logs --tail=100 "$service" >&2 || true
}

wait_for_service() {
  service="$1"
  attempt=1

  while [ "$attempt" -le "$HEALTH_ATTEMPTS" ]; do
    container_id="$(compose ps -q "$service")"

    if [ -n "$container_id" ]; then
      status="$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "$container_id" 2>/dev/null || true)"

      case "$status" in
        healthy|running)
          echo "$service is $status"
          return 0
          ;;
        unhealthy|exited|dead)
          show_service_logs "$service"
          fail "$service entered state: $status"
          ;;
      esac
    fi

    sleep "$HEALTH_INTERVAL_SECONDS"
    attempt=$((attempt + 1))
  done

  show_service_logs "$service"
  fail "$service did not become healthy in time"
}

echo "Validating production configuration"
compose config --quiet

echo "Building application images"
compose build backend web

echo "Starting data services"
compose up -d postgres redis
wait_for_service postgres
wait_for_service redis

echo "Running database migrations"
compose run --rm --no-deps backend \
  npm run migration:run:prod -w @patrol/backend

echo "Ensuring that an initial administrator exists"
compose run --rm --no-deps backend \
  npm run admin:bootstrap:prod -w @patrol/backend

echo "Updating application services"
compose up -d --no-build --remove-orphans backend web
wait_for_service backend
wait_for_service web

echo "Checking the public gateway and API route"
compose exec -T web wget -q -O /dev/null http://127.0.0.1:8080/healthz \
  || fail "web gateway health check failed"
compose exec -T web wget -q -O /dev/null http://127.0.0.1:8080/api/v1/health \
  || fail "API health check through the web gateway failed"

compose ps
echo "Production deployment completed successfully"
