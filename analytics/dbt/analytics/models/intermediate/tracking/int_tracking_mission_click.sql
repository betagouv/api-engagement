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

-- Rattache chaque clic au résultat de matching actif au moment du clic :
-- le dernier run de la session dont created_at <= clicked_at, puis le rang de
-- la mission cliquée dans ce run (via le pont mission_scoring).
click_backend as (
  select
    c.event_uuid,
    active_result.matching_engine_version,
    ranked.backend_rank
  from clicks as c
  cross join
    lateral (
      select
        mer.matching_engine_version,
        mer.results
      from {{ ref('stg_matching_engine_result') }} as mer
      where
        mer.user_scoring_id = c.quiz_session_id
        and mer.results is not null
        and mer.created_at <= c.clicked_at
      order by mer.created_at desc
      limit 1
    ) as active_result
  cross join
    lateral (
      select min(t.ord) as backend_rank
      from
        jsonb_array_elements(active_result.results)
        with ordinality as t (elem, ord)
      inner join {{ ref('stg_mission_scoring') }} as ms
        on ms.id = t.elem ->> 'missionScoringId'
      where ms.mission_id = c.mission_id
    ) as ranked
  where ranked.backend_rank is not null
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
  cb.backend_rank,
  cb.matching_engine_version,
  null::numeric as mission_score,
  cb.event_uuid is not null as matched_to_backend
from clicks as c
left join click_backend as cb on c.event_uuid = cb.event_uuid
where {{ exclude_internal_users('c.is_internal_user') }}
