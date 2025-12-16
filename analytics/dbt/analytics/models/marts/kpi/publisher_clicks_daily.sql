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
)

select
  k.kpi_date,
  c.from_publisher_id,
  k.available_jva_mission_count,
  coalesce(c.click_count, 0) as click_count,
  coalesce(c.click_count, 0)::double precision
  / nullif(k.available_jva_mission_count, 0) as ratio_clicks_per_mission
from kpi as k
left join clicks as c on k.kpi_date = c.kpi_date
where c.from_publisher_id is not null
