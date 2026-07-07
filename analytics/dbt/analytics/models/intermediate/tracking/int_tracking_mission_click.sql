with clicks as (
  select
    event_uuid,
    event_at as clicked_at,
    event_at::date as session_date,
    distinct_id,
    quiz_session_id,
    quiz_attempt_id,
    mission_id,
    publisher_id,
    publisher_name,
    section,
    rank,
    mission_domain,
    mission_type,
    opens_external,
    distance_km,
    entry_page,
    is_internal_user
  from {{ ref('stg_tracking__mission_clicked') }}
)

select
  event_uuid,
  clicked_at,
  session_date,
  distinct_id,
  quiz_session_id,
  quiz_attempt_id,
  mission_id,
  publisher_id,
  publisher_name,
  section,
  rank,
  mission_domain,
  mission_type,
  opens_external,
  distance_km,
  entry_page,
  null::numeric as mission_score
from clicks
where {{ exclude_internal_users() }}
