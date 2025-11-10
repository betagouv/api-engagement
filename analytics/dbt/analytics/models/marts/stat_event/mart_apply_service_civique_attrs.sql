{{ config (
  materialized = 'incremental',
  unique_key = 'apply_id',
  post_hook = [
    'create unique index if not exists "apply_service_civique_attrs_apply_id_idx" on {{ this }} (apply_id)',
  ]
) }}

with src as (
  select
    stat_event_id,
    created_at,
    custom_attributes::jsonb as attrs,
    to_publisher_id
  from {{ ref('stg_stat_event__apply') }}
  {% if is_incremental() %}
    where
      created_at
      > (select coalesce(max(a.created_at), '1900-01-01') from {{ this }} as a)
  {% endif %}
),

service_civique as (
  select id from {{ ref('dim_publisher') }}
  where name = '{{ var('PUBLISHER_SERVICE_CIVIQUE_NAME') }}'
)

select
  s.stat_event_id as apply_id,
  s.created_at,
  (s.attrs ->> 'hasApplicationFile')::boolean as has_application_file,
  (s.attrs ->> 'hasCandidateMotivation')::boolean as has_candidate_motivation,
  s.attrs ->> 'candidateAge' as candidate_age,
  s.attrs ->> 'candidateGender' as candidate_gender,
  s.attrs ->> 'candidatePostalCode' as candidate_postal_code
from src as s
inner join service_civique as sc on s.to_publisher_id = sc.id
where
  s.attrs is not null
  and s.attrs <> '{}'::jsonb
