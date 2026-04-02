{{ config(
  materialized = 'incremental',
  unique_key = ['publisher_id', 'client_id'],
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
  client_id,
  name,
  url,
  type,
  logo,
  description,
  full_address,
  rna,
  siren,
  siret,
  postal_code,
  city,
  legal_status,
  beneficiaries,
  actions,
  parent_organizations,
  verification_status,
  organization_id,
  created_at,
  updated_at
from source
