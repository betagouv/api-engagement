-- Tunnel quotidien par campagne (arrivée → quiz → clic mission →
-- candidature), grain (`kpi_date`, `campaign_key`), tous canaux confondus
-- (`campaign_type` : api, adwords, meta, emailing, utm ; `none` hors
-- campagne). Table à brancher directement dans Metabase : agréger par
-- `campaign_type`, `campaign_name` ou `utm_source` × `utm_medium`, comparer
-- des périodes grâce au grain jour ; pas de ratio calculé ici.
-- `visits` = visites dédoublonnées (une par clic pour les liens trackés, cf.
-- `visit_key`), à préférer à `sessions`. Dédoublonnage PAR JOUR : un clic dont
-- les deux sessions tombent de part et d'autre de minuit compte chaque jour.
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
    count(distinct visit_key) as visits,
    count(*) filter (where not is_cookieless) as sessions_with_consent,
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

-- Un quiz est rattaché à une seule session propriétaire.
quiz_campaigns as (
  select
    campaign_key,
    unnest(quiz_session_ids) as quiz_session_id
  from {{ ref('tracking_campaign_session') }}
  where campaign_key is not null and has_backend_click
),

direct_redirects as (
  select
    redirect_id,
    redirected_at,
    campaign_id as campaign_key
  from {{ ref('int_tracking_campaign_redirect') }}
),

-- Le clic d'origine l'emporte ; le quiz est un repli pour tous les canaux.
campaign_redirects as (
  select
    redirect_id,
    redirected_at,
    campaign_key
  from direct_redirects
  union all
  select
    r.stat_event_id as redirect_id,
    r.created_at as redirected_at,
    q.campaign_key
  from quiz_campaigns as q
  inner join {{ ref('click_pde_attrs') }} as pde
    on q.quiz_session_id = pde.user_scoring_id
  inner join {{ ref('click') }} as r on pde.click_id = r.stat_event_id
  where
    not r.is_bot
    and not exists (
      select 1
      from direct_redirects as d
      where d.redirect_id = r.stat_event_id
    )
),

-- Chaque événement est compté à sa propre date, pas à celle de la visite.
campaign_events as (
  -- Clics `/r/campaign/` lus dans le mart `click`, indexé sur `campaign_id`.
  select
    ck.created_at::date as kpi_date,
    ck.campaign_id as campaign_key,
    ck.stat_event_id as event_id,
    'origin_click' as event_type
  from {{ ref('click') }} as ck
  inner join campaigns as c on ck.campaign_id = c.api_campaign_id
  where
    ck.source = 'campaign'
    and not ck.is_bot
  union all
  select
    redirected_at::date as kpi_date,
    campaign_key,
    redirect_id as event_id,
    'redirect' as event_type
  from campaign_redirects
  union all
  select
    a.created_at::date as kpi_date,
    r.campaign_key,
    a.stat_event_id as event_id,
    'apply' as event_type
  from campaign_redirects as r
  inner join {{ ref('apply') }} as a on r.redirect_id = a.click_id
),

events_daily as (
  select
    kpi_date,
    campaign_key,
    count(distinct event_id) filter (where event_type = 'origin_click')
      as origin_clicks,
    count(distinct event_id) filter (where event_type = 'redirect')
      as redirections,
    count(distinct event_id) filter (where event_type = 'apply')
      as conversions
  from campaign_events
  group by kpi_date, campaign_key
),

-- Full outer join : ne perdre ni les jours avec événements sans session
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
    coalesce(a.redirections, 0) as redirections,
    coalesce(a.conversions, 0) as conversions,
    coalesce(s.sessions, 0) as sessions,
    coalesce(s.visits, 0) as visits,
    coalesce(s.sessions_with_consent, 0) as sessions_with_consent,
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
  full outer join events_daily as a
    on
      s.kpi_date = a.kpi_date
      and s.campaign_key is not distinct from a.campaign_key
)

select
  j.kpi_date,
  j.campaign_key,
  coalesce(c.campaign_type, j.session_campaign_type, case
    when sc.id is not null then 'api' else 'none'
  end) as campaign_type,
  coalesce(c.campaign_name, j.session_campaign_name, sc.name, 'Hors campagne')
    as campaign_name,
  coalesce(c.api_campaign_id, j.session_api_campaign_id, sc.id)
    as api_campaign_id,
  c.utm_source,
  c.utm_medium,
  c.utm_campaign,
  -- 0 (et non null) pour une campagne API sans clic ce jour-là.
  case
    when
      coalesce(c.api_campaign_id, j.session_api_campaign_id, sc.id) is not null
      then coalesce(j.origin_clicks, 0)
  end as origin_clicks,
  j.sessions,
  j.visits,
  j.sessions_with_consent,
  j.sessions_quiz_started,
  j.sessions_quiz_completed,
  j.sessions_results_viewed,
  j.sessions_front_mission_click,
  j.sessions_backend_click,
  j.sessions_apply,
  j.backend_clicks,
  j.applies,
  j.redirections,
  j.conversions
from joined as j
left join campaigns as c on j.campaign_key = c.campaign_key
left join {{ ref('stg_campaign') }} as sc on j.campaign_key = sc.id
order by j.kpi_date desc, j.campaign_key asc nulls first
