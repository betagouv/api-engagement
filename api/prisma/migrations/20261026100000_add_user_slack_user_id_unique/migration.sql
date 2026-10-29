-- Un ID Slack identifie au plus un compte actif (il sert à autoriser les clics sur les alertes).
CREATE UNIQUE INDEX "user_slack_user_id_active_key" ON "user" ("slack_user_id") WHERE "slack_user_id" IS NOT NULL AND "deleted_at" IS NULL;
