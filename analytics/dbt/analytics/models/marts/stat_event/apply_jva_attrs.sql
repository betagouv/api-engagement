{{ config (
  materialized = 'incremental',
  unique_key = 'apply_id',
  on_schema_change = 'sync_all_columns',
  post_hook = [
    'create unique index if not exists "apply_jva_attrs_apply_id_idx" on {{ this }} (apply_id)',
  ]
) }}

with src as (
  select
    stat_event_id,
    created_at,
    updated_at,
    custom_attributes::jsonb as attrs,
    to_publisher_id
  from {{ ref('stg_stat_event__apply') }}
  {% if is_incremental() %}
    where
      updated_at
      > (select coalesce(max(a.updated_at), '1900-01-01') from {{ this }} as a)
  {% endif %}
),

jva as (
  select id from {{ ref('dim_publisher') }}
  where name = '{{ var('PUBLISHER_JEVEUXAIDER_NAME') }}'
)

select
  s.stat_event_id as apply_id,
  s.created_at,
  s.updated_at,
  coalesce((s.attrs ->> 'newUser')::boolean, true)
    as is_new_user,
  s.attrs ->> 'candidateAge' as candidate_age,
  s.attrs ->> 'candidateJob' as candidate_job,
  s.attrs ->> 'userIdentifiant' as user_identifiant,
  s.attrs ->> 'candidatePostalCode' as candidate_postal_code
from src as s
inner join jva as sc on s.to_publisher_id = sc.id
where
  s.attrs is not null
  and s.attrs <> '{}'::jsonb
