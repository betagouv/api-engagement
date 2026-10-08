-- Référentiel des campagnes suivies sur Trouve Ta Mission, une ligne par
-- `campaign_key`, tous canaux confondus. Deux sources :
-- 1. les campagnes API (liens trackés `/r/campaign/`), `campaign_type = 'api'`,
--    limitées à celles qui atterrissent sur TTM : host de l'URL (ancien ou
--    nouveau domaine, cf. `TROUVE_TA_MISSION_HOST_PATTERNS`) OU annonceur
--    TTM. L'annonceur déclaré n'est pas forcément TTM (ex. QR code « Défi
--    engagement », annonceur Service Civique, URL vers `/missions` de TTM).
--    Supprimées conservées (`deleted_at` exposé) : leurs clics passés restent
--    nommés. UTM lus dans leurs trackers (`campaign_tracker`), l'URL de la
--    campagne en repli.
-- 2. les triplets UTM observés dans les sessions PostHog arrivées SANS lien
--    tracké (SEA, Meta, emailing...), découverts automatiquement, type déduit
--    de la convention `utm_source` / `utm_medium`. Aucune liste à maintenir :
--    une campagne Adwords apparaît dès sa première session trackée.
-- Le triplet UTM est la clé de rapprochement des sessions, en `lower()`.
-- UTM des campagnes API : saisis dans le back-office comme trackers
-- (clé / valeur, `campaign_tracker`), que l'API ajoute à l'URL de base au
-- moment de la redirection. `campaign.url` n'en garde au mieux qu'une copie
-- figée à la création, vidée à la première modification : simple repli.
-- La copie analytics de `campaign_tracker` est un upsert incrémental qui ne
-- répercute pas les suppressions : chaque modification de campagne y laisse
-- les anciennes lignes, on garde la plus récente par clé.
with latest_trackers as (
  select distinct on (campaign_id, key)
    campaign_id,
    key,
    nullif(lower(trim(value)), '') as utm_value
  from {{ ref('stg_campaign_tracker') }}
  where key in ('utm_source', 'utm_medium', 'utm_campaign')
  order by
    campaign_id asc, key asc, created_at desc, updated_at desc, id desc
),

api_trackers as (
  select
    campaign_id,
    max(utm_value) filter (where key = 'utm_source') as utm_source,
    max(utm_value) filter (where key = 'utm_medium') as utm_medium,
    max(utm_value) filter (where key = 'utm_campaign') as utm_campaign
  from latest_trackers
  group by campaign_id
),

api_campaigns as (
  select
    c.id as campaign_key,
    'api' as campaign_type,
    c.name as campaign_name,
    c.id as api_campaign_id,
    c.created_at,
    c.deleted_at,
    coalesce(
      t.utm_source, lower(substring(c.url from 'utm_source=([^&#]+)'))
    ) as utm_source,
    coalesce(
      t.utm_medium, lower(substring(c.url from 'utm_medium=([^&#]+)'))
    ) as utm_medium,
    coalesce(
      t.utm_campaign, lower(substring(c.url from 'utm_campaign=([^&#]+)'))
    ) as utm_campaign
  from {{ ref('stg_campaign') }} as c
  left join api_trackers as t on c.id = t.campaign_id
  where
    c.annonceur_id = '{{ var("PUBLISHER_TROUVE_TA_MISSION_ID") }}'
    {% for pattern in var("TROUVE_TA_MISSION_HOST_PATTERNS") %}
      or substring(c.url from '^https?://([^/]+)') like '{{ pattern }}'
    {% endfor %}
),

-- Triplets UTM des sessions sans `apiengagement_id`. Hygiène minimale sur les
-- valeurs (caractères d'un slug) pour ne pas promouvoir en campagne les UTM
-- injectés par des scanners (`javascript:...`).
session_utm as (
  select
    lower(utm_source) as utm_source,
    lower(utm_medium) as utm_medium,
    lower(utm_campaign) as utm_campaign,
    min(landing_at) as created_at
  from {{ ref('int_tracking_session') }}
  where
    landing_click_id is null
    and utm_source ~ '^[A-Za-z0-9 _.+-]+$'
    and utm_campaign ~ '^[A-Za-z0-9 _.+-]+$'
    and (utm_medium is null or utm_medium ~ '^[A-Za-z0-9 _.+-]+$')
  group by lower(utm_source), lower(utm_medium), lower(utm_campaign)
),

utm_campaigns as (
  select
    'utm:' || s.utm_source || '|' || coalesce(s.utm_medium, '') || '|'
    || s.utm_campaign as campaign_key,
    case
      when
        s.utm_source in ('google', 'googleads', 'adwords')
        and s.utm_medium in ('cpc', 'ppc', 'paidsearch', 'paid_search', 'sea')
        then 'adwords'
      when s.utm_source in ('facebook', 'instagram', 'meta', 'fb', 'ig')
        then 'meta'
      when s.utm_medium in ('email', 'emailing', 'newsletter', 'nl', 'mail')
        then 'emailing'
      else 'utm'
    end as campaign_type,
    s.utm_campaign as campaign_name,
    null as api_campaign_id,
    s.created_at,
    null::timestamp as deleted_at,
    s.utm_source,
    s.utm_medium,
    s.utm_campaign
  from session_utm as s
  -- Un triplet déjà porté par une campagne API active reste attribué à
  -- celle-ci (lien partagé sans passer par `/r/campaign/`).
  where not exists (
    select 1
    from api_campaigns as a
    where
      a.deleted_at is null
      and a.utm_source is not distinct from s.utm_source
      and a.utm_medium is not distinct from s.utm_medium
      and a.utm_campaign is not distinct from s.utm_campaign
  )
)

select
  campaign_key,
  campaign_type,
  campaign_name,
  api_campaign_id,
  created_at,
  deleted_at,
  utm_source,
  utm_medium,
  utm_campaign
from api_campaigns
union all
select
  campaign_key,
  campaign_type,
  campaign_name,
  api_campaign_id,
  created_at,
  deleted_at,
  utm_source,
  utm_medium,
  utm_campaign
from utm_campaigns
