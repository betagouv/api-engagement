{{ config(materialized='view') }}

with mission_source as (
  select
    m.id,
    m.created_at::timestamp as created_at,
    m.deleted_at::timestamp as deleted_at,
    coalesce(m.places, 0) as places,
    upper(coalesce(m.places_status, 'ATTRIBUTED_BY_API')) as places_status,
    p.name as publisher_name
  from {{ source('public', 'Mission') }} as m
  left join {{ source('public', 'Partner') }} as p on m.partner_id = p.id
),

missions as (
  select
    id,
    created_at,
    deleted_at,
    places,
    places_status,
    coalesce(publisher_name, '') as publisher_name,
    case
      when coalesce(publisher_name, '') = {{ var('PUBLISHER_SERVICE_CIVIQUE_NAME') | tojson }} then 'volontariat'
      else 'benevolat'
    end as publisher_category,
    case when coalesce(publisher_name, '') = {{ var('PUBLISHER_JEVEUXAIDER_NAME') | tojson }} then true else false end as is_jva
  from mission_source
),

date_bounds as (
  select
    (coalesce(min(created_at::date), current_date - 1) + 1) as min_date,
    (coalesce(max(coalesce(deleted_at::date, current_date)), current_date) + 1) as max_date
  from missions
),

date_spine as (
  select generate_series(min_date, max_date, interval '1 day')::date as metric_date from date_bounds
),

mission_stats as (
  select
    d.metric_date,
    coalesce(stats.available_benevolat_mission_count, 0) as available_benevolat_mission_count,
    coalesce(stats.available_volontariat_mission_count, 0) as available_volontariat_mission_count,
    coalesce(stats.available_jva_mission_count, 0) as available_jva_mission_count,
    coalesce(stats.available_benevolat_given_mission_count, 0) as available_benevolat_given_mission_count,
    coalesce(stats.available_volontariat_given_mission_count, 0) as available_volontariat_given_mission_count,
    coalesce(stats.available_benevolat_attributed_mission_count, 0) as available_benevolat_attributed_mission_count,
    coalesce(stats.available_volontariat_attributed_mission_count, 0) as available_volontariat_attributed_mission_count,
    coalesce(stats.available_benevolat_given_place_count, 0) as available_benevolat_given_place_count,
    coalesce(stats.available_volontariat_given_place_count, 0) as available_volontariat_given_place_count,
    coalesce(stats.available_benevolat_attributed_place_count, 0) as available_benevolat_attributed_place_count,
    coalesce(stats.available_volontariat_attributed_place_count, 0) as available_volontariat_attributed_place_count
  from date_spine as d
  cross join lateral (
    select
      sum(case when publisher_category = 'benevolat' then 1 else 0 end) as available_benevolat_mission_count,
      sum(case when publisher_category = 'volontariat' then 1 else 0 end) as available_volontariat_mission_count,
      sum(case when is_jva then 1 else 0 end) as available_jva_mission_count,
      sum(case when publisher_category = 'benevolat' and places_status = 'GIVEN_BY_PARTNER' then 1 else 0 end) as available_benevolat_given_mission_count,
      sum(case when publisher_category = 'volontariat' and places_status = 'GIVEN_BY_PARTNER' then 1 else 0 end) as available_volontariat_given_mission_count,
      sum(case when publisher_category = 'benevolat' and places_status = 'ATTRIBUTED_BY_API' then 1 else 0 end) as available_benevolat_attributed_mission_count,
      sum(case when publisher_category = 'volontariat' and places_status = 'ATTRIBUTED_BY_API' then 1 else 0 end) as available_volontariat_attributed_mission_count,
      sum(case when publisher_category = 'benevolat' and places_status = 'GIVEN_BY_PARTNER' then places else 0 end) as available_benevolat_given_place_count,
      sum(case when publisher_category = 'volontariat' and places_status = 'GIVEN_BY_PARTNER' then places else 0 end) as available_volontariat_given_place_count,
      sum(case when publisher_category = 'benevolat' and places_status = 'ATTRIBUTED_BY_API' then places else 0 end) as available_benevolat_attributed_place_count,
      sum(case when publisher_category = 'volontariat' and places_status = 'ATTRIBUTED_BY_API' then places else 0 end) as available_volontariat_attributed_place_count
    from missions as m
    where m.created_at < d.metric_date::timestamp
      and (m.deleted_at is null or m.deleted_at >= (d.metric_date::timestamp - interval '1 day'))
  ) as stats
)

select * from mission_stats
