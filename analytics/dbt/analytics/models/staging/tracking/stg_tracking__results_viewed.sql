with base as (
  select
    event_uuid,
    event_at,
    distinct_id,
    quiz_attempt_id,
    quiz_session_id,
    quiz_session_id_source,
    prompt_version,
    algo_version,
    device_type,
    utm_source,
    utm_campaign,
    utm_medium,
    is_internal_user,
    (properties ->> 'has_results')::boolean as has_results,
    (properties ->> 'pinned_count')::int as pinned_count,
    (properties ->> 'total_results_count')::int as total_results_count,
    (properties ->> 'page_size')::int as page_size,
    (properties ->> 'total_pages')::int as total_pages,
    properties ->> 'previous_quiz_session_id' as previous_quiz_session_id,
    (properties ->> 'avg_distance_km_top5')::numeric as avg_distance_km_top5
  from {{ ref('stg_tracking__event') }}
  where event_name = 'results.viewed'
)

select * from base
