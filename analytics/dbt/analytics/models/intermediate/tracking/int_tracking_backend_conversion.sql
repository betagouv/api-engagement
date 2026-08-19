-- Réconciliation backend d'une session quiz (`user_scoring_id`) : clics
-- sortants trackés côté `stat_event` (porteurs de
-- `custom_attributes.user_scoring_id`) et candidatures (`apply`) rattachées à
-- ces clics via `click_id`. Grain : une ligne par `quiz_session_id`.
with backend_clicks as (
  select
    stat_event_id,
    user_scoring_id as quiz_session_id,
    created_at as clicked_at,
    mission_id,
    source as click_channel
  from {{ ref('stg_stat_event__click') }}
  where
    user_scoring_id is not null
    and not is_bot
),

applies as (
  select distinct
    bc.quiz_session_id,
    a.stat_event_id as apply_id,
    a.created_at as applied_at
  from {{ ref('stg_stat_event__apply') }} as a
  inner join backend_clicks as bc on a.click_id = bc.stat_event_id
),

click_agg as (
  select
    quiz_session_id,
    count(*) as backend_click_count,
    count(distinct mission_id) as backend_clicked_mission_count,
    min(clicked_at) as first_backend_click_at
  from backend_clicks
  group by quiz_session_id
),

apply_agg as (
  select
    quiz_session_id,
    count(*) as apply_count,
    min(applied_at) as first_apply_at
  from applies
  group by quiz_session_id
)

select
  ca.quiz_session_id,
  ca.backend_click_count,
  ca.backend_clicked_mission_count,
  ca.first_backend_click_at,
  aa.first_apply_at,
  coalesce(aa.apply_count, 0) as apply_count,
  coalesce(aa.apply_count, 0) > 0 as has_apply
from click_agg as ca
left join apply_agg as aa on ca.quiz_session_id = aa.quiz_session_id
