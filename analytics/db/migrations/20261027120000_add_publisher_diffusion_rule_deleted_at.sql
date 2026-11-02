-- migrate:up
ALTER TABLE analytics_raw.publisher_diffusion_rule ADD COLUMN deleted_at TIMESTAMP(3);

-- migrate:down
ALTER TABLE analytics_raw.publisher_diffusion_rule DROP COLUMN deleted_at;
