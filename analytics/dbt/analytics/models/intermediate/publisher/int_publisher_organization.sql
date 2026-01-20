{{ config(
  materialized = 'incremental',
  unique_key = ['publisher_id', 'organization_client_id'],
  on_schema_change = 'sync_all_columns'
) }}

with source as (
  select *
  from {{ ref('stg_publisher_organization') }}
  {% if is_incremental() %}
    where
      updated_at
      > (
        select coalesce(max(p.updated_at), '1900-01-01')
        from {{ this }} as p
      )
  {% endif %}
)

select
  id,
  publisher_id,
  organization_client_id,
  organization_name,
  organization_url,
  organization_type,
  organization_logo,
  organization_description,
  organization_full_address,
  organization_rna,
  organization_siren,
  organization_siret,
  organization_department,
  organization_department_code,
  organization_department_name,
  organization_post_code,
  organization_city,
  organization_status_juridique,
  organization_beneficiaries,
  organization_actions,
  organization_reseaux,
  organization_name_verified,
  organization_rna_verified,
  organization_siren_verified,
  organization_siret_verified,
  organization_address_verified,
  organization_city_verified,
  organization_postal_code_verified,
  organization_department_code_verified,
  organization_department_name_verified,
  organization_region_verified,
  organization_verification_status,
  organisation_is_rup,
  created_at,
  updated_at
from source
