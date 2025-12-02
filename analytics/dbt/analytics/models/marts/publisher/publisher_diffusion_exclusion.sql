select
  pde.id,
  pde.excluded_by_annonceur_id,
  annonceur.name as excluded_by_annonceur_name,
  annonceur.deleted_at as excluded_by_annonceur_deleted_at,
  pde.excluded_for_diffuseur_id,
  diffuseur.name as excluded_for_diffuseur_name,
  diffuseur.deleted_at as excluded_for_diffuseur_deleted_at,
  pde.organization_client_id,
  pde.organization_name,
  pde.created_at,
  pde.updated_at
from {{ ref('stg_publisher_diffusion_exclusion') }} as pde
left join
  {{ ref('stg_publisher') }} as annonceur
  on pde.excluded_by_annonceur_id = annonceur.id
left join
  {{ ref('stg_publisher') }} as diffuseur
  on pde.excluded_for_diffuseur_id = diffuseur.id
