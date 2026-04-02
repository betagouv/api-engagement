{{ config(
  materialized = 'incremental',
  unique_key = 'id',
  on_schema_change = 'sync_all_columns',
  post_hook = [
    'create index if not exists "int_mission_publisher_id" on {{ this }} (publisher_id)',
  ]
) }}

with last_run as (
  {% if is_incremental() %}
    select coalesce(max(updated_at), '1900-01-01'::timestamp) as last_updated_at
    from {{ this }}
  {% else %}
    select '1900-01-01'::timestamp as last_updated_at
  {% endif %}
),

publisher_organizations as (
  select
    id,
    organization_id,
    updated_at
  from {{ ref('int_publisher_organization') }}
),

missions as (
  select m.*
  from {{ ref('stg_mission') }} as m
  {% if is_incremental() %}
    left join publisher_organizations as po
      on m.publisher_organization_id = po.id
    where
      m.updated_at > (select lr.last_updated_at from last_run as lr)
      or coalesce(po.updated_at, '1900-01-01'::timestamp)
      > (select lr.last_updated_at from last_run as lr)
  {% endif %}
),

domains as (
  select
    id as domain_id,
    name as domain_name
  from {{ ref('stg_domain') }}
),

mission_activities as (
  select
    ma.mission_id,
    string_agg(a.name, ', ' order by a.name) as activity_names
  from {{ ref('stg_mission_activity') }} as ma
  left join {{ ref('stg_activity') }} as a on ma.activity_id = a.id
  group by ma.mission_id
)

select
  m.id,
  m.client_id,
  m.publisher_id,
  m.publisher_organization_id,
  po.organization_id,
  m.organization_client_id,
  m.domain_id,
  m.title,
  m.description,
  m.domain_original,
  m.type,
  m.status_code,
  m.status_code as status,
  m.compensation_amount,
  m.compensation_type,
  m.compensation_unit,
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
  greatest(m.updated_at, coalesce(po.updated_at, m.updated_at)) as updated_at,
  ma.activity_names as activity,
  coalesce(d.domain_name, m.domain_original) as domain,
  (m.deleted_at is not null) as is_deleted
from missions as m
left join publisher_organizations as po on m.publisher_organization_id = po.id
left join domains as d on m.domain_id = d.domain_id
left join mission_activities as ma on m.id = ma.mission_id
