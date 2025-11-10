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
),

prepared as (
  select
    *,
    md5(stat_event_id::text) as event_hash
  from src
)

select
  stat_event_id,
  created_at,
  campaign_id,
  widget_id,
  source::"SourceType" as source,
  source_id,
  host,
  from_publisher_id,
  to_publisher_id,
  mission_id,
  mission_id_raw,
  updated_at,
  concat_ws(
    '-',
    substr(event_hash, 1, 8),
    substr(event_hash, 9, 4),
    substr(event_hash, 13, 4),
    substr(event_hash, 17, 4),
    substr(event_hash, 21, 12)
  ) as id
from prepared
