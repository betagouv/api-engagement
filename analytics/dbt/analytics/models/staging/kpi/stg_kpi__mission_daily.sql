{{ config(materialized='view') }}

{% set publisher_service_civique = var('PUBLISHER_SERVICE_CIVIQUE_NAME') %}
{% set publisher_jva = var('PUBLISHER_JEVEUXAIDER_NAME') %}

with mission_source as (
  select
    m.id,
    m.created_at::timestamp as created_at,
    m.deleted_at::timestamp as deleted_at,
    p.name as publisher_name,
    coalesce(m.places, 0) as places,
    upper(coalesce(m.places_status, 'ATTRIBUTED_BY_API')) as places_status
  from {{ source('public', 'Mission') }} as m
  left join {{ ref('publisher') }} as p on m.partner_id = p.id
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
      when
        coalesce(publisher_name, '') = '{{ publisher_service_civique }}'
        then 'volontariat'
      else 'benevolat'
    end as publisher_category,
    coalesce(publisher_name, '') = '{{ publisher_jva }}' as is_jva
  from mission_source
),

date_bounds as (
  select
    (coalesce(min(created_at::date), current_date - 1) + 1) as min_date,
    (
      coalesce(max(coalesce(deleted_at::date, current_date)), current_date) + 1
    ) as max_date
  from missions
),

date_spine as (
  select gs.metric_date
  from date_bounds as bounds
  cross join lateral generate_series(
    bounds.min_date,
    bounds.max_date,
    interval '1 day'
  ) as gs (metric_date)
),

mission_stats as (
  select
    stats.*,
    d.metric_date
  from date_spine as d
  cross join lateral (
    select
      sum(
        case
          when m.publisher_category = 'benevolat' then 1
          else 0
        end
      ) as available_benevolat_mission_count,
      sum(
        case
          when m.publisher_category = 'volontariat' then 1
          else 0
        end
      ) as available_volontariat_mission_count,
      sum(
        case
          when m.is_jva then 1
          else 0
        end
      ) as available_jva_mission_count,
      sum(
        case
          when
            m.publisher_category = 'benevolat'
            and m.places_status = 'GIVEN_BY_PARTNER'
            then 1
          else 0
        end
      ) as available_benevolat_given_mission_count,
      sum(
        case
          when
            m.publisher_category = 'volontariat'
            and m.places_status = 'GIVEN_BY_PARTNER'
            then 1
          else 0
        end
      ) as available_volontariat_given_mission_count,
      sum(
        case
          when
            m.publisher_category = 'benevolat'
            and m.places_status = 'ATTRIBUTED_BY_API'
            then 1
          else 0
        end
      ) as available_benevolat_attributed_mission_count,
      sum(
        case
          when
            m.publisher_category = 'volontariat'
            and m.places_status = 'ATTRIBUTED_BY_API'
            then 1
          else 0
        end
      ) as available_volontariat_attributed_mission_count,
      sum(
        case
          when
            m.publisher_category = 'benevolat'
            and m.places_status = 'GIVEN_BY_PARTNER'
            then m.places
          else 0
        end
      ) as available_benevolat_given_place_count,
      sum(
        case
          when
            m.publisher_category = 'volontariat'
            and m.places_status = 'GIVEN_BY_PARTNER'
            then m.places
          else 0
        end
      ) as available_volontariat_given_place_count,
      sum(
        case
          when
            m.publisher_category = 'benevolat'
            and m.places_status = 'ATTRIBUTED_BY_API'
            then m.places
          else 0
        end
      ) as available_benevolat_attributed_place_count,
      sum(
        case
          when
            m.publisher_category = 'volontariat'
            and m.places_status = 'ATTRIBUTED_BY_API'
            then m.places
          else 0
        end
      ) as available_volontariat_attributed_place_count
    from missions as m
    where
      m.created_at < d.metric_date::timestamp
      and (
        m.deleted_at is null
        or m.deleted_at >= (d.metric_date::timestamp - interval '1 day')
      )
  ) as stats
)

select * from mission_stats
