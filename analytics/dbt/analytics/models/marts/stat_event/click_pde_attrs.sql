{{ config (
  materialized = 'incremental',
  unique_key = 'click_id',
  on_schema_change = 'sync_all_columns',
  post_hook = [
    'create unique index if not exists "click_pde_attrs_click_id_idx" on {{ this }} (click_id)',
  ]
) }}

-- Attributs spécifiques Plateforme de l'Engagement (Trouve Ta Mission) portés
-- par les `custom_attributes` des `stat_event` de type `click` issus des
-- résultats du quiz ou d'un email. Grain : une ligne par clic
-- (`click_id` = `stat_event_id` du clic). Même patron que `apply_jva_attrs` /
-- `apply_service_civique_attrs`.
with src as (
  select
    stat_event_id,
    created_at,
    updated_at,
    custom_attributes::jsonb as attrs
  from {{ ref('stg_stat_event__click') }}
  {% if is_incremental() %}
    where
      updated_at
      > (select coalesce(max(a.updated_at), '1900-01-01') from {{ this }} as a)
  {% endif %}
)

select
  s.stat_event_id as click_id,
  s.created_at,
  s.updated_at,
  nullif(s.attrs ->> 'user_scoring_id', '') as user_scoring_id
from src as s
where nullif(s.attrs ->> 'user_scoring_id', '') is not null
