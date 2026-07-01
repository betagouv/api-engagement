-- CreateIndex
-- Permet de résoudre une organisation par son client_id, puis de récupérer ses missions
-- (jointure stat_event -> mission -> publisher_organization filtrée sur po.client_id).
-- Sans ces index, le planner part de stat_event et scanne tous les clics des diffuseurs
-- sur 30 jours avant de filtrer sur l'organisation (cf. GET /v0/myorganization/:id).
CREATE INDEX CONCURRENTLY IF NOT EXISTS "publisher_organization_client_id_idx"
ON "public"."publisher_organization" ("client_id");

CREATE INDEX CONCURRENTLY IF NOT EXISTS "mission_publisher_organization_id_idx"
ON "public"."mission" ("publisher_organization_id");
