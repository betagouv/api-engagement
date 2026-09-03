with started as (
  select
    quiz_attempt_id,
    max(distinct_id) as distinct_id,
    min(event_at) as started_at,
    max(entry_source) as entry_source,
    max(device_type) as device_type,
    max(utm_source) as utm_source,
    max(utm_campaign) as utm_campaign,
    max(utm_medium) as utm_medium,
    max(quiz_version) as quiz_version,
    max(prompt_version) as prompt_version,
    max(algo_version) as algo_version
  from {{ ref('stg_tracking__quiz_started') }}
  where quiz_attempt_id is not null
  group by quiz_attempt_id
),

steps as (
  select
    quiz_attempt_id,
    max(distinct_id) as distinct_id,
    count(*) as step_events_count,
    max(step_index) as last_step_index,
    max(total_visible_steps) as total_visible_steps,
    (array_agg(step_name order by step_index desc nulls last))[1]
      as last_step_name
  from {{ ref('stg_tracking__quiz_step_completed') }}
  where quiz_attempt_id is not null
  group by quiz_attempt_id
),

completed as (
  select
    quiz_attempt_id,
    max(distinct_id) as distinct_id,
    max(quiz_session_id) as quiz_session_id,
    min(event_at) as completed_at,
    max(completion_type) as completion_type,
    max(quiz_path) as quiz_path,
    max(steps_completed_count) as steps_completed_count,
    bool_or(has_localisation) as has_localisation,
    max(statut) as statut,
    max(motivation) as motivation,
    max(age_bracket) as age_bracket,
    max(quiz_duration_ms) as quiz_duration_ms
  from {{ ref('stg_tracking__quiz_completed') }}
  where quiz_attempt_id is not null
  group by quiz_attempt_id
),

-- Géo DÉCLARÉE au quiz (étape localisation), pas la géo GeoIP de PostHog.
-- Null pour les tentatives ayant abandonné avant l'étape localisation.
localisation_geo as (
  select
    quiz_attempt_id,
    max(geo_postcode) as postcode,
    max(geo_lat) as geo_lat,
    max(geo_lon) as geo_lon,
    max(geo_country_code) as country_code
  from {{ ref('stg_tracking__quiz_step_completed') }}
  where
    quiz_attempt_id is not null
    and step_name = 'localisation'
  group by quiz_attempt_id
),

geo as (
  select
    quiz_attempt_id,
    postcode,
    geo_lat,
    geo_lon,
    country_code,
    case
      when postcode ~ '^(97[1-8]|98[4-9])' then left(postcode, 3)
      when left(postcode, 2) = '20'
        then case
          when substr(postcode, 1, 3)::int < 202 then '2A'
          else '2B'
        end
      else left(postcode, 2)
    end as department_code
  from localisation_geo
),

geo_enriched as (
  select
    g.quiz_attempt_id,
    g.postcode,
    g.geo_lat,
    g.geo_lon,
    g.country_code,
    g.department_code,
    dc.department_name,
    dc.region_code,
    dc.region_name
  from geo as g
  left join {{ ref('department_codes') }} as dc
    on g.department_code = dc.department_code
),

joined as (
  select
    c.quiz_session_id,
    s.started_at,
    s.started_at::date as session_date,
    s.entry_source,
    s.device_type,
    s.utm_source,
    s.utm_campaign,
    s.utm_medium,
    s.quiz_version,
    s.prompt_version,
    s.algo_version,
    c.completed_at,
    c.completion_type,
    st.last_step_name,
    st.last_step_index,
    st.total_visible_steps,
    c.quiz_path,
    c.quiz_duration_ms,
    c.statut,
    c.motivation,
    c.age_bracket,
    c.has_localisation,
    coalesce(s.distinct_id, st.distinct_id, c.distinct_id) as distinct_id,
    coalesce(s.quiz_attempt_id, st.quiz_attempt_id, c.quiz_attempt_id)
      as quiz_attempt_id,
    c.completed_at is not null as is_completed,
    coalesce(c.steps_completed_count, st.step_events_count)
      as steps_completed_count
  from started as s
  full outer join steps as st on s.quiz_attempt_id = st.quiz_attempt_id
  full outer join completed as c
    on coalesce(s.quiz_attempt_id, st.quiz_attempt_id) = c.quiz_attempt_id
)

select
  j.*,
  ge.postcode,
  ge.geo_lat,
  ge.geo_lon,
  ge.country_code,
  ge.department_code,
  ge.department_name,
  ge.region_code,
  ge.region_name
from joined as j
left join geo_enriched as ge on j.quiz_attempt_id = ge.quiz_attempt_id
where {{ exclude_internal_distinct_ids('j.distinct_id') }}
