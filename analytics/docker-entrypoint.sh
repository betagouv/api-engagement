#!/bin/sh

set -e

if [ -n "${DATABASE_URL_ANALYTICS:-}" ]; then
  url="$DATABASE_URL_ANALYTICS"

  creds="${url#*//}"         # user:pass@host:port/db
  creds="${creds%@*}"        # user:pass
  hostportdb="${url#*@}"     # host:port/db

  user="${creds%%:*}"
  pass="${creds#*:}"
  hostport="${hostportdb%%/*}"
  db="${hostportdb#*/}"
  host="${hostport%%:*}"
  port="${hostport#*:}"

  export DBT_DB_USER="$user"
  export DBT_DB_PASSWORD="$pass"
  export DBT_DB_HOST="$host"
  export DBT_DB_PORT="${port:-5432}"
  export DBT_DB_NAME="${db%%\?*}"   # enlève ?sslmode=...
fi

echo "🚀 Running DB migration..."
npm run db:migrate

if [ -n "${JOB_CMD:-}" ]; then
  echo "🔧 Executing JOB_CMD: $JOB_CMD"
  exec sh -lc "$JOB_CMD"
fi