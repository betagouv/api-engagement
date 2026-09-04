with base as (
  select
    event_uuid,
    event_at,
    distinct_id,
    quiz_attempt_id,
    quiz_session_id,
    quiz_version,
    prompt_version,
    algo_version,
    device_type,
    utm_source,
    utm_campaign,
    utm_medium,
    is_internal_user,
    (properties ->> 'step_index')::int as step_index,
    (properties ->> 'total_visible_steps')::int as total_visible_steps,
    (properties ->> 'geo_lat')::numeric as geo_lat,
    (properties ->> 'geo_lon')::numeric as geo_lon,
    properties ->> 'step_name' as step_name,
    properties ->> 'quiz_path' as quiz_path,
    properties ->> 'answer_value' as answer_value,
    properties ->> 'geo_postcode' as geo_postcode,
    properties ->> 'geo_country_code' as geo_country_code
  from {{ ref('stg_tracking__event') }}
  where event_name = 'quiz.step_completed'
)

select * from base
