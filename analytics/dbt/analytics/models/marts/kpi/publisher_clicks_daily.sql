{{ config(
  materialized = 'incremental',
  unique_key = ['kpi_date', 'from_publisher_id'],
  on_schema_change = 'sync_all_columns'
) }}

with kpi as (
  select
    kpi_date,
    available_jva_mission_count
  from {{ ref('kpi_daily') }}
  where
    is_bot_filtered = true
    {% if is_incremental() %}
      and kpi_date >= (
        select coalesce(max(pc.kpi_date), '1900-01-01') from {{ this }} as pc
      )
    {% endif %}
),

publishers as (
  select distinct from_publisher_id
  from {{ ref('click') }}
  where source = 'api' and is_bot is not true
),

clicks as (
  select
    from_publisher_id,
    date(created_at) as kpi_date,
    count(*) as click_count
  from {{ ref('click') }}
  where
    source = 'api'
    and is_bot is not true
    {% if is_incremental() %}
      and created_at >= (
        select coalesce(max(pc.kpi_date), '1900-01-01') from {{ this }} as pc
      )
    {% endif %}
  group by 1, 2
),

date_publisher as (
  select
    k.kpi_date,
    k.available_jva_mission_count,
    p.from_publisher_id
  from kpi as k
  cross join publishers as p
)

select
  dp.kpi_date,
  dp.from_publisher_id,
  dp.available_jva_mission_count,
  coalesce(c.click_count, 0) as click_count,
  coalesce(c.click_count, 0)::double precision
  / nullif(dp.available_jva_mission_count, 0) as ratio_clicks_per_mission
from date_publisher as dp
left join clicks as c
  on
    dp.kpi_date = c.kpi_date
    and dp.from_publisher_id = c.from_publisher_id
