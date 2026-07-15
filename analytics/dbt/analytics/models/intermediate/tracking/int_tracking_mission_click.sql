with clicks as (
  select
    event_uuid,
    event_at as clicked_at,
    event_at::date as session_date,
    distinct_id,
    quiz_session_id,
    quiz_attempt_id,
    utm_source,
    utm_campaign,
    utm_medium,
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
),

-- Un seul run de matching par session (le plus récent).
latest_result as (
  select distinct on (user_scoring_id)
    user_scoring_id,
    matching_engine_version,
    results
  from {{ ref('matching_engine_result') }}
  where results is not null
  order by user_scoring_id asc, created_at desc
),

-- Déplie le classement backend : rang (ordinality) et scoring de mission.
backend_ranked as (
  select
    lr.user_scoring_id,
    lr.matching_engine_version,
    t.ord as backend_rank,
    t.elem ->> 'missionScoringId' as mission_scoring_id
  from latest_result as lr
  cross join
    lateral jsonb_array_elements(lr.results)
    with ordinality as t (elem, ord)
),

-- Pont vers mission_id via mission_scoring. Une ligne par (session,
-- mission), meilleur rang gardé pour éviter le fan-out (unicité event_uuid).
backend_missions as (
  select distinct on (br.user_scoring_id, ms.mission_id)
    br.user_scoring_id,
    ms.mission_id,
    br.backend_rank,
    br.matching_engine_version
  from backend_ranked as br
  inner join {{ ref('mission_scoring') }} as ms on br.mission_scoring_id = ms.id
  order by br.user_scoring_id asc, ms.mission_id asc, br.backend_rank asc
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
  bm.backend_rank,
  bm.matching_engine_version,
  null::numeric as mission_score,
  bm.mission_id is not null as matched_to_backend
from clicks as c
left join backend_missions as bm
  on
    c.quiz_session_id = bm.user_scoring_id
    and c.mission_id = bm.mission_id
where {{ exclude_internal_users('c.is_internal_user') }}
