{{ config(
    materialized = 'incremental',
    unique_key   = 'stat_event_id',
    on_schema_change = 'sync_all_columns',
    post_hook = [
      'create unique index if not exists "Apply_stat_event_id_key" on {{ this }} (stat_event_id)',
      'create index if not exists "apply_mission_id" on {{ this }} (mission_id)',
      'create index if not exists "apply_campaign_id" on {{ this }} (campaign_id)',
      'create index if not exists "apply_widget_id" on {{ this }} (widget_id)',
      'create index if not exists "apply_from_publisher_id" on {{ this }} (from_publisher_id)',
      'create index if not exists "apply_to_publisher_id" on {{ this }} (to_publisher_id)',
    ]
) }}

with src as (
  select *
  from {{ ref('stg_stat_event__apply') }}
  {% if is_incremental() %}
    where
      created_at
      > (select coalesce(max(a.created_at), '1900-01-01') from {{ this }} as a)
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
  tag,
  from_publisher_id,
  to_publisher_id,
  mission_id,
  resolved_mission_id_raw as mission_id_raw,
  click_id,
  view_id_raw,
  status,
  custom_attributes,
  updated_at
from src
