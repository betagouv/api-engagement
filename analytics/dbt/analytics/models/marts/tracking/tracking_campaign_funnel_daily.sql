-- Tunnel quotidien par campagne (arrivée → quiz → clic mission →
-- candidature), grain (`kpi_date`, `campaign_key`), tous canaux confondus
-- (`campaign_type` : api, adwords, meta, emailing, utm ; `none` hors
-- campagne). Table à brancher directement dans Metabase : agréger par
-- `campaign_type`, `campaign_name` ou `utm_source` × `utm_medium`, comparer
-- des périodes grâce au grain jour ; pas de ratio calculé ici, Metabase les
-- dérive (ex. `sessions_apply / sessions`).
-- `origin_clicks` = clics comptés par la plateforme d'origine, hors PostHog :
-- redirections `/r/campaign/` pour les campagnes API, null pour les autres
-- types tant qu'aucun export (Google Ads, Meta) n'est importé.
with sessions as (
  select
    session_date as kpi_date,
    campaign_key,
    -- Dépendent fonctionnellement de `campaign_key` ; servent de repli pour
    -- une campagne API sortie du périmètre du référentiel.
    max(campaign_type) as campaign_type,
    max(campaign_name) as campaign_name,
    max(api_campaign_id) as api_campaign_id,
    count(*) as sessions,
    count(*) filter (where has_quiz_started) as sessions_quiz_started,
    count(*) filter (where has_quiz_completed) as sessions_quiz_completed,
    count(*) filter (where has_results_viewed) as sessions_results_viewed,
    count(*) filter (where has_front_mission_click)
      as sessions_front_mission_click,
    count(*) filter (where has_backend_click) as sessions_backend_click,
    count(*) filter (where has_apply) as sessions_apply,
    sum(backend_click_count) as backend_clicks,
    sum(apply_count) as applies
  from {{ ref('tracking_campaign_session') }}
  group by session_date, campaign_key
),

campaigns as (
  select
    campaign_key,
    campaign_type,
    campaign_name,
    api_campaign_id,
    utm_source,
    utm_medium,
    utm_campaign
  from {{ ref('int_tracking_campaign') }}
),

-- Clics `/r/campaign/` côté API (campagnes API du référentiel, supprimées
-- incluses), lus dans le mart `click` (indexé sur `campaign_id`) plutôt que
-- dans la vue staging sur `stat_event` (28 M de lignes, index sur `id`
-- seulement).
api_clicks as (
  select
    ck.created_at::date as kpi_date,
    ck.campaign_id as campaign_key,
    count(*) as origin_clicks
  from {{ ref('click') }} as ck
  inner join campaigns as c on ck.campaign_id = c.api_campaign_id
  where
    ck.source = 'campaign'
    and not ck.is_bot
  group by ck.created_at::date, ck.campaign_id
),

-- Full outer join : ne perdre ni les jours avec clics API sans session
-- trackée, ni l'inverse (attribution UTM d'un lien partagé sans passer par
-- `/r/campaign/`, ou campagne non API).
joined as (
  select
    coalesce(s.kpi_date, a.kpi_date) as kpi_date,
    coalesce(s.campaign_key, a.campaign_key) as campaign_key,
    s.campaign_type as session_campaign_type,
    s.campaign_name as session_campaign_name,
    s.api_campaign_id as session_api_campaign_id,
    a.origin_clicks,
    coalesce(s.sessions, 0) as sessions,
    coalesce(s.sessions_quiz_started, 0) as sessions_quiz_started,
    coalesce(s.sessions_quiz_completed, 0) as sessions_quiz_completed,
    coalesce(s.sessions_results_viewed, 0) as sessions_results_viewed,
    coalesce(s.sessions_front_mission_click, 0)
      as sessions_front_mission_click,
    coalesce(s.sessions_backend_click, 0) as sessions_backend_click,
    coalesce(s.sessions_apply, 0) as sessions_apply,
    coalesce(s.backend_clicks, 0) as backend_clicks,
    coalesce(s.applies, 0) as applies
  from sessions as s
  full outer join api_clicks as a
    on
      s.kpi_date = a.kpi_date
      and s.campaign_key is not distinct from a.campaign_key
)

select
  j.kpi_date,
  j.campaign_key,
  coalesce(c.campaign_type, j.session_campaign_type, 'none') as campaign_type,
  coalesce(c.campaign_name, j.session_campaign_name, 'Hors campagne')
    as campaign_name,
  coalesce(c.api_campaign_id, j.session_api_campaign_id) as api_campaign_id,
  c.utm_source,
  c.utm_medium,
  c.utm_campaign,
  -- 0 (et non null) pour une campagne API sans clic ce jour-là.
  case
    when coalesce(c.campaign_type, j.session_campaign_type) = 'api'
      then coalesce(j.origin_clicks, 0)
  end as origin_clicks,
  j.sessions,
  j.sessions_quiz_started,
  j.sessions_quiz_completed,
  j.sessions_results_viewed,
  j.sessions_front_mission_click,
  j.sessions_backend_click,
  j.sessions_apply,
  j.backend_clicks,
  j.applies
from joined as j
left join campaigns as c on j.campaign_key = c.campaign_key
order by j.kpi_date desc, j.campaign_key asc nulls first
