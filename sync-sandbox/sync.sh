#!/usr/bin/env bash
set -euo pipefail

# Syncs production data into the sandbox database.
#
# Required env vars:
#   DATABASE_URL_PROD  - source (production) connection string
#   DATABASE_URL_CORE  - destination (sandbox) connection string

TABLES=(
  domain
  activity
  organization
  publisher
  user
  user_publisher
  publisher_diffusion
  publisher_diffusion_exclusion
  publisher_organization
  widget
  widget_rule
  widget_publisher
  campaign
  campaign_tracker
  warning
  warning_bot
  import
  mission
  mission_address
  mission_activity
  mission_moderation_status
  mission_jobboard
)

TABLE_FLAGS=$(printf -- '--table=%s ' "${TABLES[@]}")

echo "[sync-sandbox] Truncating sandbox tables..."
psql "$DATABASE_URL_CORE_SANDBOX" -v ON_ERROR_STOP=1 \
  -c 'TRUNCATE TABLE publisher, "user", organization, domain, activity CASCADE'

# pg_dump --data-only outputs COPY statements in topological FK order,
# so no need to disable FK checks during restore.
echo "[sync-sandbox] Dumping prod and restoring to sandbox..."
pg_dump "$DATABASE_URL_CORE_PROD" \
  --data-only \
  --no-acl \
  --no-owner \
  $TABLE_FLAGS \
| psql "$DATABASE_URL_CORE_SANDBOX" -v ON_ERROR_STOP=1

echo "[sync-sandbox] Anonymizing user credentials..."
psql "$DATABASE_URL_CORE_SANDBOX" -v ON_ERROR_STOP=1 << 'SQL'
UPDATE "user" SET
  password                   = NULL,
  invitation_token           = NULL,
  invitation_expires_at      = NULL,
  forgot_password_token      = NULL,
  forgot_password_expires_at = NULL;
SQL

echo "[sync-sandbox] Done."
