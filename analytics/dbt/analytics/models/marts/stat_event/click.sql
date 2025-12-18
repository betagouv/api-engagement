{{ config(
    materialized = 'incremental',
    unique_key   = 'stat_event_id',
    on_schema_change = 'sync_all_columns',
    post_hook = [
      'create unique index if not exists "Click_stat_event_id_key" on {{ this }} (stat_event_id)',
      'create index if not exists "click_mission_id" on {{ this }} (mission_id)',
      'create index if not exists "click_campaign_id" on {{ this }} (campaign_id)',
      'create index if not exists "click_widget_id" on {{ this }} (widget_id)',
      'create index if not exists "click_from_publisher_id" on {{ this }} (from_publisher_id)',
      'create index if not exists "click_to_publisher_id" on {{ this }} (to_publisher_id)',
    ]
) }}

with src as (
  select *
  from {{ ref('stg_stat_event__click') }}
  {% if is_incremental() %}
    where
      updated_at
      > (select coalesce(max(c.updated_at), '1900-01-01') from {{ this }} as c)
  {% endif %}
)

select
  stat_event_id,
  created_at,
  url_origin,
  tag,
  tags,
  click_id,
  source::text as source,
  source_id,
  campaign_id,
  widget_id,
  to_publisher_id,
  from_publisher_id,
  mission_id,
  mission_id_raw,
  is_bot,
  is_human,
  updated_at
from src
