-- Missions recommandées par le moteur de matching, une ligne par mission du
-- DERNIER run de chaque session quiz (`user_scoring_id`). Le pont vers la
-- mission puis le publisher passe par `mission_scoring`
-- (`results[i].missionScoringId` = `mission_scoring.id` -> `mission_id` ->
-- `mission.publisher_id`). Base du KPI « part des recommandations par
-- annonceur ». Personnes internes exclues au niveau du `distinct_id`.
with latest_result as (
  select distinct on (user_scoring_id)
    user_scoring_id,
    matching_engine_version,
    results,
    created_at
  from {{ ref('stg_matching_engine_result') }}
  where results is not null
  order by user_scoring_id asc, created_at desc
),

exploded as (
  select
    lr.user_scoring_id as quiz_session_id,
    lr.matching_engine_version,
    lr.created_at::date as session_date,
    t.ord as backend_rank,
    t.elem ->> 'missionScoringId' as mission_scoring_id
  from latest_result as lr
  cross join
    lateral jsonb_array_elements(lr.results)
    with ordinality as t (elem, ord)
),

with_mission as (
  select
    e.quiz_session_id,
    e.matching_engine_version,
    e.session_date,
    e.backend_rank,
    e.mission_scoring_id,
    ms.mission_id
  from exploded as e
  inner join {{ ref('stg_mission_scoring') }} as ms
    on e.mission_scoring_id = ms.id
),

with_publisher as (
  select
    wm.quiz_session_id,
    wm.matching_engine_version,
    wm.session_date,
    wm.backend_rank,
    wm.mission_scoring_id,
    wm.mission_id,
    m.publisher_id,
    p.name as publisher_name
  from with_mission as wm
  inner join {{ ref('stg_mission') }} as m on wm.mission_id = m.id
  left join {{ ref('stg_publisher') }} as p on m.publisher_id = p.id
),

with_distinct as (
  select
    wp.quiz_session_id,
    wp.matching_engine_version,
    wp.session_date,
    wp.backend_rank,
    wp.mission_scoring_id,
    wp.mission_id,
    wp.publisher_id,
    wp.publisher_name,
    us.distinct_id
  from with_publisher as wp
  left join {{ ref('stg_user_scoring') }} as us on wp.quiz_session_id = us.id
)

select
  quiz_session_id,
  session_date,
  matching_engine_version,
  backend_rank,
  mission_scoring_id,
  mission_id,
  publisher_id,
  publisher_name
from with_distinct
where {{ exclude_internal_distinct_ids('distinct_id') }}
