select
  id,
  excluded_by_annonceur_id,
  excluded_for_diffuseur_id,
  organization_client_id,
  organization_name,
  created_at::timestamp as created_at,
  updated_at::timestamp as updated_at
from {{ source('analytics_raw', 'publisher_diffusion_exclusion') }}
