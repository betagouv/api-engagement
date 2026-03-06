{{ config(materialized = 'view') }}

with missions as (
  select *
  from {{ ref('int_mission') }}
),

publisher_organizations as (
  select *
  from {{ ref('int_publisher_organization') }}
)

select
  m.id,
  m.client_id,
  m.publisher_id,
  m.publisher_organization_id,
  m.organization_id,
  m.organization_client_id,
  m.activity,
  m.domain_original,
  m.title,
  m.description,
  m.type,
  m.status_code,
  m.compensation_amount,
  m.compensation_type,
  m.compensation_unit,
  m.status,
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
  m.domain,
  m.is_deleted,
  po.name as organization_name,
  po.url as organization_url,
  po.type as organization_type,
  po.logo as organization_logo,
  po.description as organization_description,
  po.full_address as organization_full_address,
  po.rna as organization_rna,
  po.siren as organization_siren,
  po.siret as organization_siret,
  po.postal_code as organization_post_code,
  po.city as organization_city,
  po.legal_status as organization_status_juridique,
  po.beneficiaries as organization_beneficiaries,
  po.actions as organization_actions,
  po.parent_organizations as organization_reseaux,
  po.organisation_is_rup
from missions as m
left join publisher_organizations as po
  on
    m.publisher_id = po.publisher_id
    and m.organization_client_id = po.client_id
