-- migrate:up
CREATE SCHEMA IF NOT EXISTS analytics_raw;

-- migrate:down
DROP SCHEMA IF EXISTS analytics_raw CASCADE;
