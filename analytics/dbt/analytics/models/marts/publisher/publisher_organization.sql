{{ config(materialized = 'view') }}

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
from {{ ref('int_publisher_organization') }}
