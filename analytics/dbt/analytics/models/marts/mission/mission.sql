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
  m.organization_id,
  m.organization_client_id,
  m.activity,
  m.domain_original,
  m.title,
  m.description,
  m.type,
  m.status_code,
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
  po.organization_name,
  po.organization_url,
  po.organization_type,
  po.organization_logo,
  po.organization_description,
  po.organization_full_address,
  po.organization_rna,
  po.organization_siren,
  po.organization_siret,
  po.organization_department,
  po.organization_department_code,
  po.organization_department_name,
  po.organization_post_code,
  po.organization_city,
  po.organization_status_juridique,
  po.organization_beneficiaries,
  po.organization_actions,
  po.organization_reseaux,
  po.organization_name_verified,
  po.organization_rna_verified,
  po.organization_siren_verified,
  po.organization_siret_verified,
  po.organization_address_verified,
  po.organization_city_verified,
  po.organization_postal_code_verified,
  po.organization_department_code_verified,
  po.organization_department_name_verified,
  po.organization_region_verified,
  po.organization_verification_status,
  po.organisation_is_rup
from missions as m
left join publisher_organizations as po
  on
    m.publisher_id = po.publisher_id
    and m.organization_client_id = po.organization_client_id
