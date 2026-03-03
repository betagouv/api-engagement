{{ config(
  materialized = 'incremental',
  unique_key = 'apply_id',
  incremental_strategy = 'delete+insert',
  on_schema_change = 'sync_all_columns'
) }}

with last_run as (
  {% if is_incremental() %}
    select coalesce(max(updated_at), '1900-01-01'::timestamp) as last_updated_at
    from {{ this }}
  {% else %}
    select '1900-01-01'::timestamp as last_updated_at
  {% endif %}
),

affected_clicks as (
  select distinct a.click_id
  from {{ ref('apply') }} as a
  where
    a.click_id is not null
    and coalesce(a.updated_at, a.created_at)
    >= (select lr.last_updated_at from last_run as lr)
),

base as (
  select
    a.stat_event_id as apply_id,
    a.click_id,
    a.mission_id,
    a.created_at,
    a.updated_at
  from {{ ref('apply') }} as a
  where
    a.click_id is not null
    {% if is_incremental() %}
      and a.click_id in (select ac.click_id from affected_clicks as ac)
    {% endif %}
),

click_counts as (
  select
    a.click_id,
    count(*) as apply_count
  from {{ ref('apply') }} as a
  where
    a.click_id is not null
    {% if is_incremental() %}
      and a.click_id in (select ac.click_id from affected_clicks as ac)
    {% endif %}
  group by a.click_id
)

select
  b.apply_id,
  b.click_id,
  b.mission_id,
  b.created_at,
  b.updated_at,
  cc.apply_count,
  greatest(cc.apply_count - 1, 0) as other_apply_count,
  (cc.apply_count >= 2) as is_shared_click
from base as b
inner join click_counts as cc
  on b.click_id = cc.click_id
