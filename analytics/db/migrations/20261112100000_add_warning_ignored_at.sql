-- migrate:up
ALTER TABLE analytics_raw.warning ADD COLUMN ignored_at TIMESTAMP(3);

-- migrate:down
ALTER TABLE analytics_raw.warning DROP COLUMN ignored_at;
