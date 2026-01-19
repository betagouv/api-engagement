{{ config(
  materialized = 'incremental',
  unique_key = 'id',
  on_schema_change = 'sync_all_columns',
  post_hook = [
    'create index if not exists "int_mission_publisher_id" on {{ this }} (publisher_id)',
  ]
) }}

with missions as (
  select *
  from {{ ref('stg_mission') }}
  {% if is_incremental() %}
    where
      updated_at
      > (
        select coalesce(max(m.updated_at), '1900-01-01') from {{ this }} as m
      )
  {% endif %}
),

domains as (
  select
    id as domain_id,
    name as domain_name
  from {{ ref('stg_domain') }}
),

activities as (
  select
    id as activity_id,
    name as activity_name
  from {{ ref('stg_activity') }}
)

select
  m.id,
  m.client_id,
  m.publisher_id,
  m.organization_id,
  m.organization_client_id,
  m.domain_id,
  m.activity_id,
  a.activity_name as activity,
  m.title,
  m.description,
  m.domain_original,
  m.type,
  m.status_code,
  m.status_code as status,
  m.priority,
  m.tags,
  m.tasks,
  m.audience,
  m.soft_skills,
  m.requirements,
  m.rome_skills,
  m.reduced_mobility_accessible,
  m.close_to_transport,
  m.open_to_minors,
  m.remote,
  m.schedule,
  m.duration,
  m.posted_at,
  m.start_at,
  m.end_at,
  m.places,
  m.places_status,
  m.deleted_at,
  m.created_at,
  m.updated_at,
  coalesce(d.domain_name, m.domain_original) as domain,
  (m.deleted_at is not null) as is_deleted
from missions as m
left join domains as d on m.domain_id = d.domain_id
left join activities as a on m.activity_id = a.activity_id
