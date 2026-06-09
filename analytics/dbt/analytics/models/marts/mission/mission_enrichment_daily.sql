{{ config(
  materialized = 'incremental',
  unique_key = ['event_date', 'publisher_id', 'status'],
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
  select distinct date(me.created_at) as event_date
  from {{ ref('mission_enrichment') }} as me
  cross join last_run
  {% if is_incremental() %}
    where
      coalesce(me.updated_at, me.created_at)
      >= last_run.last_updated_at
  {% endif %}
),

base as (
  select
    m.publisher_id,
    p.name as publisher_name,
    me.status,
    me.input_tokens,
    me.output_tokens,
    me.total_tokens,
    date(me.created_at) as event_date,
    coalesce(me.updated_at, me.created_at) as updated_at
  from {{ ref('mission_enrichment') }} as me
  left join {{ ref('mission') }} as m on me.mission_id = m.id
  left join {{ ref('dim_publisher') }} as p on m.publisher_id = p.id
  {% if is_incremental() %}
    where date(me.created_at) in (
      select ad.event_date
      from affected_dates as ad
    )
  {% endif %}
),

aggregated as (
  select
    event_date,
    publisher_id,
    publisher_name,
    status,
    count(*) as enrichment_count,
    sum(input_tokens) as input_tokens,
    sum(output_tokens) as output_tokens,
    sum(total_tokens) as total_tokens,
    max(updated_at) as max_updated_at
  from base
  group by event_date, publisher_id, publisher_name, status
)

select *
from aggregated
