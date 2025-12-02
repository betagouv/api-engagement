{{ config(
    materialized = 'incremental',
    unique_key   = 'stat_event_id',
    on_schema_change = 'sync_all_columns',
    post_hook = [
      'create unique index if not exists "Impression_stat_event_id_key" on {{ this }} (stat_event_id)',
      'create index if not exists "impression_mission_id" on {{ this }} (mission_id)',
      'create index if not exists "impression_to_publisher_id" on {{ this }} (to_publisher_id)',
      'create index if not exists "impression_from_publisher_id" on {{ this }} (from_publisher_id)',
      'create index if not exists "impression_campaign_id" on {{ this }} (campaign_id)',
    ]
) }}

with src as (
  select *
  from {{ ref('stg_stat_event__print') }}
  {% if is_incremental() %}
    where
      created_at
      > (select coalesce(max(i.created_at), '1900-01-01') from {{ this }} as i)
  {% endif %}
)

select
  stat_event_id,
  created_at,
  campaign_id,
  widget_id,
  source::text as source,
  source_id,
  host,
  from_publisher_id,
  to_publisher_id,
  mission_id,
  mission_id_raw,
  updated_at
from src
