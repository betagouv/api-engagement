{{ config(
  materialized = 'incremental',
  unique_key = ['event_date', 'mission_domain', 'jobboard_id'],
  incremental_strategy = 'delete+insert',
  on_schema_change = 'sync_all_columns'
) }}

with last_run as (
  {% if is_incremental() %}
    select
      coalesce(max(max_updated_at), '1900-01-01'::timestamp)
        as last_updated_at
    from {{ this }}
  {% else %}
    select '1900-01-01'::timestamp as last_updated_at
  {% endif %}
),

affected_dates as (
  select distinct date(mjb.created_at) as event_date
  from {{ ref('mission_jobboard') }} as mjb
  cross join last_run
  {% if is_incremental() %}
    where
      coalesce(mjb.updated_at, mjb.created_at)
      >= last_run.last_updated_at
  {% endif %}
),

base as (
  select
    mjb.jobboard_id,
    mjb.sync_status,
    date(mjb.created_at) as event_date,
    coalesce(m.domain, 'unknown') as mission_domain,
    coalesce(mjb.updated_at, mjb.created_at) as updated_at
  from {{ ref('mission_jobboard') }} as mjb
  left join {{ ref('mission') }} as m on mjb.mission_id = m.id
  {% if is_incremental() %}
    where date(mjb.created_at) in (
      select ad.event_date
      from affected_dates as ad
    )
  {% endif %}
),

aggregated as (
  select
    event_date,
    mission_domain,
    jobboard_id,
    count(*) as mission_jobboard_count,
    count(*) filter (where sync_status = 'ONLINE') as online_count,
    count(*) filter (where sync_status = 'OFFLINE') as offline_count,
    count(*) filter (where sync_status = 'ERROR') as error_count,
    max(updated_at) as max_updated_at
  from base
  group by event_date, mission_domain, jobboard_id
)

select *
from aggregated
