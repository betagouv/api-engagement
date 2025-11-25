-- migrate:up
CREATE TABLE IF NOT EXISTS analytics_raw.kpi_daily (
    kpi_date DATE NOT NULL,
    is_bot_filtered BOOLEAN NOT NULL DEFAULT FALSE,
    available_benevolat_mission_count INTEGER NOT NULL DEFAULT 0,
    available_volontariat_mission_count INTEGER NOT NULL DEFAULT 0,
    available_jva_mission_count INTEGER NOT NULL DEFAULT 0,
    available_benevolat_given_mission_count INTEGER NOT NULL DEFAULT 0,
    available_volontariat_given_mission_count INTEGER NOT NULL DEFAULT 0,
    available_benevolat_attributed_mission_count INTEGER NOT NULL DEFAULT 0,
    available_volontariat_attributed_mission_count INTEGER NOT NULL DEFAULT 0,
    available_benevolat_given_place_count INTEGER NOT NULL DEFAULT 0,
    available_volontariat_given_place_count INTEGER NOT NULL DEFAULT 0,
    available_benevolat_attributed_place_count INTEGER NOT NULL DEFAULT 0,
    available_volontariat_attributed_place_count INTEGER NOT NULL DEFAULT 0,
    percentage_benevolat_given_places DOUBLE PRECISION NOT NULL DEFAULT 0,
    percentage_volontariat_given_places DOUBLE PRECISION NOT NULL DEFAULT 0,
    percentage_benevolat_attributed_places DOUBLE PRECISION NOT NULL DEFAULT 0,
    percentage_volontariat_attributed_places DOUBLE PRECISION NOT NULL DEFAULT 0,
    benevolat_print_mission_count INTEGER NOT NULL DEFAULT 0,
    volontariat_print_mission_count INTEGER NOT NULL DEFAULT 0,
    benevolat_click_mission_count INTEGER NOT NULL DEFAULT 0,
    volontariat_click_mission_count INTEGER NOT NULL DEFAULT 0,
    benevolat_apply_mission_count INTEGER NOT NULL DEFAULT 0,
    volontariat_apply_mission_count INTEGER NOT NULL DEFAULT 0,
    benevolat_account_mission_count INTEGER NOT NULL DEFAULT 0,
    volontariat_account_mission_count INTEGER NOT NULL DEFAULT 0,
    benevolat_print_count INTEGER NOT NULL DEFAULT 0,
    volontariat_print_count INTEGER NOT NULL DEFAULT 0,
    benevolat_click_count INTEGER NOT NULL DEFAULT 0,
    volontariat_click_count INTEGER NOT NULL DEFAULT 0,
    benevolat_apply_count INTEGER NOT NULL DEFAULT 0,
    volontariat_apply_count INTEGER NOT NULL DEFAULT 0,
    benevolat_account_count INTEGER NOT NULL DEFAULT 0,
    volontariat_account_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT kpi_daily_pk PRIMARY KEY (kpi_date, is_bot_filtered)
);

CREATE INDEX IF NOT EXISTS kpi_daily_date_idx ON analytics_raw.kpi_daily (kpi_date);

-- migrate:down
DROP TABLE IF EXISTS analytics_raw.kpi_daily;
