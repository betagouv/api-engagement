{{ config(
  materialized = 'incremental',
  unique_key = ['active_date', 'mission_id'],
  incremental_strategy = 'delete+insert',
  on_schema_change = 'sync_all_columns',
  post_hook = [
    'create index if not exists "int_mission_active_daily_active_date_idx" on {{ this }} (active_date)',
    'create index if not exists "int_mission_active_daily_mission_id_idx" on {{ this }} (mission_id)',
  ]
) }}

with last_run as (
  {% if is_incremental() %}
    select coalesce(max(active_date), '1900-01-01'::date) as last_active_date
    from {{ this }}
  {% else %}
    select '1900-01-01'::date as last_active_date
  {% endif %}
),

base as (
  select
    m.id as mission_id,
    date_trunc('day', m.created_at)::date as start_date,
    date_trunc('day', coalesce(m.deleted_at, current_date))::date as end_date,
    m.domain as mission_domain,
    m.publisher_id,
    m.updated_at,
    case
      when m.type = 'volontariat_service_civique' then 'volontariat'
      else m.type
    end as publisher_category
  from {{ ref('int_mission') }} as m
  where
    m.created_at is not null
    and date_trunc('day', m.created_at)::date
    <= date_trunc('day', coalesce(m.deleted_at, current_date))::date
),

active_days as (
  select
    b.mission_id,
    b.publisher_id,
    b.publisher_category,
    b.mission_domain,
    s.day as active_date,
    b.updated_at
  from base as b
  inner join lateral (
    select generate_series(
      b.start_date,
      b.end_date,
      interval '1 day'
    )::date as day
  ) as s on true
  {% if is_incremental() %}
    where s.day >= (select lr.last_active_date from last_run as lr)
  {% endif %}
)

select
  active_date,
  extract(year from active_date)::int as year,
  extract(month from active_date)::int as month,
  extract(isoyear from active_date)::int as iso_year,
  extract(week from active_date)::int as iso_week,
  publisher_id,
  publisher_category,
  mission_domain,
  mission_id,
  updated_at
from active_days
