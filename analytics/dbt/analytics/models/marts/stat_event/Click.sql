{{ config(
    materialized = 'incremental',
    unique_key   = 'old_id',
    post_hook = [
      'create unique index if not exists "Click_old_id_key" on {{ this }} (old_id)',
      'create index if not exists "click_mission_id" on {{ this }} (mission_id)',
      'create index if not exists "click_campaign_id" on {{ this }} (campaign_id)',
      'create index if not exists "click_widget_id" on {{ this }} (widget_id)',
      'create index if not exists "click_from_partner_id" on {{ this }} (from_partner_id)',
      'create index if not exists "click_to_partner_id" on {{ this }} (to_partner_id)',
    ]
) }}

with src as (
  select *
  from {{ ref('stg_stat_event__click') }}
  {% if is_incremental() %}
    where
      created_at
      > (select coalesce(max(created_at), '1900-01-01') from {{ this }})
  {% endif %}
),

prepared as (
  select
    *,
    md5(event_id::text) as event_hash
  from src
)

select
  event_id as old_id,
  created_at,
  url_origin,
  tag,
  tags,
  click_id,
  source::"SourceType" as source,
  source_id,
  campaign_id,
  widget_id,
  to_partner_id,
  from_partner_id,
  mission_id,
  mission_old_id,
  is_bot,
  is_human,
  concat_ws(
    '-',
    substr(event_hash, 1, 8),
    substr(event_hash, 9, 4),
    substr(event_hash, 13, 4),
    substr(event_hash, 17, 4),
    substr(event_hash, 21, 12)
  ) as id,
  now() as updated_at
from prepared
