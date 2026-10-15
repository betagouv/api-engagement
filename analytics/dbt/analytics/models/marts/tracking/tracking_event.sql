-- Tous les événements métier, internes exclus. `properties` ne garde que les
-- propriétés métier : on retire les clés techniques PostHog (`$...`), les
-- clés techniques sans `$`, les super properties déjà exposées en colonnes,
-- les identifiants de clic publicitaire, et la localisation déclarée au quiz
-- (coordonnées, adresse saisie).
select
  e.event_uuid,
  e.event_name,
  e.event_at,
  e.event_at::date as event_date,
  e.distinct_id,
  e.posthog_session_id,
  e.quiz_attempt_id,
  e.quiz_attempt_id_source,
  e.quiz_session_id,
  e.quiz_session_id_source,
  e.is_cookieless_mode,
  e.quiz_version,
  e.device_type,
  e.pathname,
  e.utm_source,
  e.utm_medium,
  e.utm_campaign,
  (
    select coalesce(jsonb_object_agg(p.key, p.value), '{}'::jsonb)
    from jsonb_each(e.properties) as p
    where
      p.key not like '$%'
      and p.key not in (
        -- Techniques, sans `$`.
        'token',
        'distinct_id',
        'internal_user',
        -- Déjà en colonnes.
        'quiz_attempt_id',
        'quiz_session_id',
        'quiz_version',
        'utm_source',
        'utm_medium',
        'utm_campaign',
        -- Identifiants de clic publicitaire capturés par PostHog.
        'gclid',
        'gad_source',
        'gclsrc',
        'dclid',
        'gbraid',
        'wbraid',
        'fbclid',
        'msclkid',
        'twclid',
        'li_fat_id',
        'igshid',
        'ttclid',
        'rdt_cid',
        'epik',
        'qclid',
        'sccid',
        'irclid',
        '_kx',
        'mc_cid',
        -- Coordonnées déclarées à l'étape `localisation` : jamais exposées.
        'geo_lat',
        'geo_lon'
      )
      -- Adresse saisie à l'étape `localisation` : jamais exposée.
      and not (
        p.key = 'answer_value'
        and e.properties ->> 'step_name' = 'localisation'
      )
  ) as properties
from {{ ref('stg_tracking__event') }} as e
where
  not e.is_internal_user
  and {{ exclude_internal_distinct_ids('e.distinct_id') }}
