-- Rang du `quiz.started` en cours dans la session PostHog (0 avant le
-- premier), base des tentatives reconstituées pour les visiteurs sans cookies.
with source_events as (
  select
    *,
    count(*) filter (where event = 'quiz.started') over (
      partition by session_id
      order by timestamp, uuid
      rows between unbounded preceding and current row
    ) as session_quiz_start_rank
  from {{ source('analytics_raw', 'tracking_event') }}
  where event not like '$%'
),

flagged_events as (
  select
    *,
    coalesce((properties ->> '$cookieless_mode')::boolean, false)
    and nullif(session_id, '') is not null
    and session_quiz_start_rank > 0 as is_cookieless_in_quiz
  from source_events
),

base as (
  select
    uuid as event_uuid,
    event as event_name,
    timestamp::timestamp as event_at,
    ingested_at::timestamp as ingested_at,
    distinct_id,
    person_id,
    session_id as posthog_session_id,
    current_url,
    pathname,
    properties,
    (properties ->> '$screen_width')::int as screen_width,
    (properties ->> '$screen_height')::int as screen_height,
    -- Sans consentement cookies, le front retire aussi `quiz_attempt_id`. On
    -- reconstitue la tentative à partir de la session PostHog (présente en
    -- cookieless) : chaque `quiz.started` ouvre une nouvelle tentative, les
    -- événements suivants de la session s'y rattachent. Avant le premier
    -- `quiz.started` de la session : pas de tentative.
    case
      when properties ->> 'quiz_attempt_id' is not null
        then properties ->> 'quiz_attempt_id'
      when is_cookieless_in_quiz
        then 'cookieless:' || session_id || ':' || session_quiz_start_rank
    end as quiz_attempt_id,
    case
      when properties ->> 'quiz_attempt_id' is not null then 'property'
      when is_cookieless_in_quiz then 'session'
    end as quiz_attempt_id_source,
    -- Sans consentement cookies, le front retire la super property
    -- `quiz_session_id` ; l'id du scoring (`user_scoring_id`) reste lisible
    -- dans l'URL de la page de résultats et de la fiche mission ouverte depuis
    -- les résultats (`/results/<id>`, `/results/<id>/missions/<mission>`),
    -- enregistrée même en cookieless. La propriété reste PRIORITAIRE : un
    -- visiteur avec cookies revenu sur une ancienne page `/results/<id>`
    -- garde son id courant.
    coalesce(
      properties ->> 'quiz_session_id',
      substring(current_url from '/results/([0-9a-fA-F-]{36})')
    ) as quiz_session_id,
    case
      when properties ->> 'quiz_session_id' is not null then 'property'
      when current_url ~ '/results/[0-9a-fA-F-]{36}' then 'url'
    end as quiz_session_id_source,
    properties ->> 'quiz_version' as quiz_version,
    properties ->> 'prompt_version' as prompt_version,
    properties ->> 'algo_version' as algo_version,
    properties ->> '$device_type' as device_type,
    properties ->> '$geoip_city_name' as geo_city,
    properties ->> '$geoip_subdivision_1_name' as geo_region,
    properties ->> '$geoip_country_code' as geo_country_code,
    properties ->> '$referrer' as referrer,
    properties ->> '$referring_domain' as referring_domain,
    properties ->> 'utm_source' as utm_source,
    properties ->> 'utm_campaign' as utm_campaign,
    properties ->> 'utm_medium' as utm_medium,
    properties ->> 'utm_term' as utm_term,
    properties ->> 'utm_content' as utm_content,
    properties ->> 'gclid' as gclid,
    properties ->> 'fbclid' as fbclid,
    coalesce((properties ->> 'internal_user')::boolean, false)
      as is_internal_user,
    -- Posée par PostHog sur les événements sans consentement cookies ;
    -- absente (et non `false`) sur les autres.
    coalesce((properties ->> '$cookieless_mode')::boolean, false)
      as is_cookieless_mode
  from flagged_events
)

select * from base
