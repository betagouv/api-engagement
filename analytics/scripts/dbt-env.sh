#!/usr/bin/env sh
set -eu

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="${SCRIPT_DIR%/scripts}"

if [ -f "$PROJECT_ROOT/.env" ]; then
  set -a
  . "$PROJECT_ROOT/.env"
  set +a
fi

if [ -z "${DATABASE_URL_ANALYTICS:-}" ]; then
  echo "DATABASE_URL_ANALYTICS not defined" >&2
  exit 1
fi

url="$DATABASE_URL_ANALYTICS"

creds="${url#*://}"      # user:pass@host:port/db?...
creds="${creds%@*}"      # user:pass
hostportdb="${url#*@}"   # host:port/db?...

export DBT_DB_USER="${creds%%:*}"
export DBT_DB_PASSWORD="${creds#*:}"

hostport="${hostportdb%%/*}"
export DBT_DB_HOST="${hostport%%:*}"
export DBT_DB_PORT="${hostport#*:}"

dbname="${hostportdb#*/}"
export DBT_DB_NAME="${dbname%%\?*}"

cd "$PROJECT_ROOT/dbt/analytics"

dbt "$@"

if [ -n "${METABASE_URL:-}" ] && [ -n "${METABASE_DATABASE_NAME:-}" ] && [ -n "${METABASE_API_KEY:-}" ]; then
  if [ ! -f target/manifest.json ]; then
    echo "Metabase sync skipped: target/manifest.json not found" >&2
    exit 0
  fi

  echo "Syncing dbt metadata to Metabase..."
  dbt-metabase models \
    --manifest-path target/manifest.json \
    --metabase-url "$METABASE_URL" \
    --metabase-database "$METABASE_DATABASE_NAME" \
    --metabase-api-key "$METABASE_API_KEY" \
    --include-schemas analytics
fi
