-- Session de tracking PostHog sur Trouve Ta Mission, une ligne par
-- `tracking_session_id`. Contrairement à `int_tracking_quiz_session` (qui part
-- de `quiz.started`), cette vue part de l'ATTERRISSAGE : les visiteurs qui
-- n'ont jamais lancé le quiz sont comptés. Clé de session :
-- `posthog_session_id`, avec repli `distinct_id || ':' || date` pour les rares
-- events sans session PostHog (~1 %, tous porteurs d'un `distinct_id`).
-- Les UTM et l'`apiengagement_id` sont lus sur le PREMIER événement : les
-- super properties PostHog peuvent être perdues si le consentement cookies est
-- donné après avoir quitté la page d'arrivée.
-- Personnes internes exclues au niveau du `distinct_id`.
with events as (
  select
    event_uuid,
    event_name,
    event_at,
    distinct_id,
    posthog_session_id,
    current_url,
    pathname,
    utm_source,
    utm_campaign,
    utm_medium,
    utm_term,
    utm_content,
    gclid,
    fbclid,
    quiz_attempt_id,
    quiz_session_id,
    coalesce(
      nullif(posthog_session_id, ''),
      distinct_id || ':' || event_at::date
    ) as tracking_session_id
  from {{ ref('stg_tracking__event') }}
  where {{ exclude_internal_distinct_ids('distinct_id') }}
),

ordered as (
  select
    *,
    row_number() over (
      partition by tracking_session_id order by event_at, event_uuid
    ) as event_rank,
    -- UTM de repli : premier événement de la session ayant un `utm_source`.
    row_number() over (
      partition by tracking_session_id
      order by (utm_source is null), event_at, event_uuid
    ) as utm_rank,
    -- Session « propriétaire » d'un `quiz_session_id` : celle où il est vu
    -- pour la première fois. La super property persiste entre les visites
    -- d'une même personne ; sans ce rattachement unique, les conversions
    -- backend seraient comptées sur chaque visite ultérieure.
    first_value(tracking_session_id) over (
      partition by quiz_session_id order by event_at, event_uuid
    ) as quiz_session_owner_id
  from events
  where tracking_session_id is not null
),

owned as (
  select
    *,
    quiz_session_id is not null
    and quiz_session_owner_id = tracking_session_id as is_owned_quiz_session
  from ordered
),

landing as (
  select
    tracking_session_id,
    event_name as landing_event_name,
    pathname as landing_pathname,
    current_url as landing_url,
    utm_source as landing_utm_source,
    utm_campaign as landing_utm_campaign,
    utm_medium as landing_utm_medium
  from ordered
  where event_rank = 1
),

utm as (
  select
    tracking_session_id,
    utm_source,
    utm_campaign,
    utm_medium,
    utm_term,
    utm_content
  from ordered
  where utm_rank = 1
),

agg as (
  select
    tracking_session_id,
    max(posthog_session_id) as posthog_session_id,
    max(distinct_id) as distinct_id,
    min(event_at) as landing_at,
    max(event_at) as last_event_at,
    count(*) as event_count,
    max(
      substring(current_url from 'apiengagement_id=([0-9a-fA-F-]{36})')
    ) as landing_click_id,
    max(gclid) as gclid,
    max(fbclid) as fbclid,
    bool_or(event_name = 'quiz.started') as has_quiz_started,
    bool_or(event_name = 'quiz.completed') as has_quiz_completed,
    bool_or(event_name = 'results.viewed') as has_results_viewed,
    bool_or(event_name = 'mission_detail.viewed') as has_mission_detail_viewed,
    count(*) filter (where event_name = 'mission.clicked')
      as front_mission_click_count,
    count(distinct quiz_attempt_id) filter (where event_name = 'quiz.started')
      as quiz_attempt_count,
    array_agg(distinct quiz_session_id) filter (where is_owned_quiz_session)
      as quiz_session_ids,
    (
      array_agg(quiz_session_id order by event_at, event_uuid)
      filter (where is_owned_quiz_session)
    )[1] as first_quiz_session_id
  from owned
  group by tracking_session_id
)

select
  a.tracking_session_id,
  a.posthog_session_id,
  a.distinct_id,
  a.landing_at,
  a.landing_at::date as session_date,
  a.last_event_at,
  a.event_count,
  l.landing_event_name,
  l.landing_pathname,
  l.landing_url,
  l.landing_utm_source,
  l.landing_utm_campaign,
  l.landing_utm_medium,
  u.utm_source,
  u.utm_campaign,
  u.utm_medium,
  u.utm_term,
  u.utm_content,
  a.landing_click_id,
  a.gclid,
  a.fbclid,
  a.has_quiz_started,
  a.has_quiz_completed,
  a.has_results_viewed,
  a.has_mission_detail_viewed,
  a.front_mission_click_count,
  a.front_mission_click_count > 0 as has_front_mission_click,
  a.quiz_attempt_count,
  a.quiz_session_ids,
  a.first_quiz_session_id
from agg as a
inner join landing as l on a.tracking_session_id = l.tracking_session_id
inner join utm as u on a.tracking_session_id = u.tracking_session_id
