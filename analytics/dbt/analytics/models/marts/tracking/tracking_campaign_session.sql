-- Fait session (grain `tracking_session_id`) du suivi des campagnes sur Trouve
-- Ta Mission, exposé à Metabase pour le drill-down. Rattache chaque session
-- PostHog à une campagne du référentiel `int_tracking_campaign` (API, Adwords,
-- Meta, emailing...) et y agrège le tunnel front (quiz, résultats, clics
-- cartes) et les conversions backend (redirections API vers l'annonceur,
-- candidatures).
with sessions as (
  select * from {{ ref('int_tracking_session') }}
),

campaigns as (
  select * from {{ ref('int_tracking_campaign') }}
),

-- Attribution 1 : le clic de campagne API dont l'id est passé dans l'URL
-- d'arrivée (`?apiengagement_id=<stat_event_id>`). Lu dans le mart `click`
-- (matérialisé, indexé sur `stat_event_id`) et non dans la vue staging :
-- `stat_event` n'a d'index que sur `id`, tout autre filtre y coûte un scan
-- complet (~1 min en prod). Tout clic `campaign` est admis : par construction
-- il a redirigé vers TTM, même si l'URL de la campagne a changé depuis.
campaign_clicks as (
  select
    stat_event_id,
    campaign_id
  from {{ ref('click') }}
  where source = 'campaign'
),

-- Attribution 2 (repli) : triplet UTM de la session comparé, null-safe, au
-- triplet du référentiel. Une session sans aucun UTM ne doit pas matcher une
-- campagne API dont l'URL n'en porte pas non plus. En cas d'égalité, campagne
-- API active d'abord, puis la plus récente.
utm_attribution as (
  select distinct on (s.tracking_session_id)
    s.tracking_session_id,
    c.campaign_key
  from sessions as s
  inner join campaigns as c
    on
      lower(s.utm_source) is not distinct from c.utm_source
      and lower(s.utm_campaign) is not distinct from c.utm_campaign
      and lower(s.utm_medium) is not distinct from c.utm_medium
  where
    c.deleted_at is null
    and (
      s.utm_source is not null
      or s.utm_campaign is not null
      or s.utm_medium is not null
    )
  order by
    s.tracking_session_id asc,
    (c.campaign_type = 'api') desc,
    c.created_at desc
),

-- Conversions backend : une session porte 0..n `quiz_session_id` (chacun
-- rattaché à une seule session, cf. `int_tracking_session`).
session_quiz as (
  select
    tracking_session_id,
    unnest(quiz_session_ids) as quiz_session_id
  from sessions
),

backend as (
  select
    sq.tracking_session_id,
    sum(bc.backend_click_count) as backend_click_count,
    sum(bc.backend_clicked_mission_count) as backend_clicked_mission_count,
    sum(bc.apply_count) as apply_count,
    min(bc.first_backend_click_at) as first_backend_click_at,
    min(bc.first_apply_at) as first_apply_at
  from session_quiz as sq
  inner join {{ ref('int_tracking_backend_conversion') }} as bc
    on sq.quiz_session_id = bc.quiz_session_id
  group by sq.tracking_session_id
),

attributed as (
  select
    s.*,
    cc.campaign_id as campaign_key_from_click,
    ua.campaign_key as campaign_key_from_utm,
    coalesce(cc.campaign_id, ua.campaign_key) as campaign_key
  from sessions as s
  left join campaign_clicks as cc on s.landing_click_id = cc.stat_event_id
  left join utm_attribution as ua
    on s.tracking_session_id = ua.tracking_session_id
)

select
  a.tracking_session_id,
  a.posthog_session_id,
  a.distinct_id,
  a.landing_at,
  a.session_date,
  a.last_event_at,
  a.event_count,
  a.landing_event_name,
  a.landing_pathname,
  a.landing_url,
  a.landing_utm_source,
  a.landing_utm_campaign,
  a.landing_utm_medium,
  a.utm_source,
  a.utm_campaign,
  a.utm_medium,
  a.utm_term,
  a.utm_content,
  a.gclid,
  a.fbclid,
  a.landing_click_id,
  a.campaign_key_from_click,
  a.campaign_key_from_utm,
  a.campaign_key,
  -- Clic sur une campagne API sortie du périmètre (URL modifiée) : la
  -- campagne reste typée et nommée via `stg_campaign`.
  case
    when a.campaign_key is null then null
    else coalesce(c.campaign_type, 'api')
  end as campaign_type,
  coalesce(c.campaign_name, sc.name) as campaign_name,
  coalesce(c.api_campaign_id, sc.id) as api_campaign_id,
  case
    when a.campaign_key_from_click is not null then 'click_id'
    when a.campaign_key_from_utm is not null then 'utm'
  end as attribution_method,
  a.campaign_key is not null as is_from_campaign,
  a.has_quiz_started,
  a.has_quiz_completed,
  a.has_results_viewed,
  a.has_mission_detail_viewed,
  a.front_mission_click_count,
  a.has_front_mission_click,
  a.quiz_attempt_count,
  a.quiz_session_ids,
  a.first_quiz_session_id,
  b.first_backend_click_at,
  b.first_apply_at,
  coalesce(b.backend_click_count, 0) as backend_click_count,
  coalesce(b.backend_clicked_mission_count, 0)
    as backend_clicked_mission_count,
  coalesce(b.apply_count, 0) as apply_count,
  coalesce(b.backend_click_count, 0) > 0 as has_backend_click,
  coalesce(b.apply_count, 0) > 0 as has_apply
from attributed as a
left join campaigns as c on a.campaign_key = c.campaign_key
left join {{ ref('stg_campaign') }} as sc on a.campaign_key_from_click = sc.id
left join backend as b on a.tracking_session_id = b.tracking_session_id
order by a.landing_at desc
