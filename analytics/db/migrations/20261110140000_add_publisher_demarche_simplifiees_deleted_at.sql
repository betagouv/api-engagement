-- migrate:up
ALTER TABLE analytics_raw.publisher_demarche_simplifiees ADD COLUMN deleted_at TIMESTAMP(3);

-- migrate:down
ALTER TABLE analytics_raw.publisher_demarche_simplifiees DROP COLUMN deleted_at;
