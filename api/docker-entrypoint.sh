#!/bin/sh
set -eu

cancel_scaleway_deployment() {
  if [ -z "${SCW_DEPLOYMENT_ID:-}" ] || [ -z "${SCW_SECRET_KEY:-}" ]; then
    echo "Scaleway deployment cancellation skipped: missing SCW_DEPLOYMENT_ID or SCW_SECRET_KEY" >&2
    return
  fi

  REGION="${SCW_REGION:-fr-par}"
  API_URL="${SCW_API_URL:-https://api.scaleway.com}"
  DEPLOYMENT_ENDPOINT="${API_URL%/}/containers/v1beta1/regions/${REGION}/deployments/${SCW_DEPLOYMENT_ID}/cancel"

  echo "Attempting to cancel Scaleway deployment ${SCW_DEPLOYMENT_ID}..." >&2

  HTTP_CODE=$(curl -sS -o /tmp/scw-cancel-response -w "%{http_code}" \
    -X POST "${DEPLOYMENT_ENDPOINT}" \
    -H "Content-Type: application/json" \
    -H "X-Auth-Token: ${SCW_SECRET_KEY}") || HTTP_CODE="000"

  if [ "${HTTP_CODE}" != "204" ]; then
    echo "Failed to cancel Scaleway deployment. HTTP status: ${HTTP_CODE}" >&2
    cat /tmp/scw-cancel-response >&2 || true
  else
    echo "Scaleway deployment cancelled." >&2
  fi

  rm -f /tmp/scw-cancel-response
}

run_migrations() {
  echo "Running Prisma migrations..."
  if npm run prisma:migrate:deploy; then
    echo "Prisma migrations executed successfully."
  else
    echo "Prisma migrations failed." >&2
    cancel_scaleway_deployment
    exit 1
  fi
}

run_migrations
exec node /app/dist/index.js
