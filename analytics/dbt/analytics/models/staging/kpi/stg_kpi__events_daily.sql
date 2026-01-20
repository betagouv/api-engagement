{{ config(materialized='view') }}

{% set publisher_service_civique = var('PUBLISHER_SERVICE_CIVIQUE_NAME') %}

with events as (
  select
    e.id,
    e.type,
    e.created_at::timestamp as created_at,
    nullif(e.mission_id, '') as mission_id,
    e.is_bot::boolean as is_bot,
    p.name as to_publisher_name,
    case
      when
        coalesce(p.name, '') = '{{ publisher_service_civique }}'
        then 'volontariat'
      else 'benevolat'
    end as publisher_category,
    (date_trunc('day', e.created_at::timestamp) + interval '1 day')::date
      as metric_date
  from {{ ref('stg_stat_event') }} as e
  left join {{ ref('publisher') }} as p
    on e.to_publisher_id = p.id
),

scenarios as (
  select false as is_bot_filtered
  union all
  select true as is_bot_filtered
)

select
  e.metric_date,
  s.is_bot_filtered,
  e.publisher_category,
  e.type as event_type,
  count(*) as event_count,
  count(distinct e.mission_id)
  filter (where e.mission_id is not null) as mission_count
from events as e
inner join scenarios as s
  on (
    not s.is_bot_filtered
    or (
      s.is_bot_filtered
      and coalesce(e.is_bot, false) = false
    )
  )
where
  e.metric_date is not null
  and e.publisher_category in ('benevolat', 'volontariat')
group by
  e.metric_date,
  s.is_bot_filtered,
  e.publisher_category,
  e.type
