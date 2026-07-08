with clicks as (
  select * from {{ ref('int_tracking_mission_click') }}
),

sessions as (
  select
    quiz_session_id,
    statut,
    age_bracket
  from {{ ref('int_tracking_quiz_session') }}
  where quiz_session_id is not null
)

select
  c.event_uuid,
  c.clicked_at,
  c.session_date,
  c.distinct_id,
  c.quiz_session_id,
  c.quiz_attempt_id,
  c.utm_source,
  c.utm_campaign,
  c.utm_medium,
  c.mission_id,
  c.publisher_id,
  c.publisher_name,
  c.section,
  c.rank,
  c.mission_domain,
  c.mission_type,
  c.opens_external,
  c.distance_km,
  c.entry_page,
  c.mission_score,
  s.statut,
  s.age_bracket
from clicks as c
left join sessions as s on c.quiz_session_id = s.quiz_session_id
order by c.clicked_at desc
