select
  id,
  name,
  category,
  is_annonceur::boolean,
  has_api_rights::boolean as diffuseur_api,
  has_widget_rights::boolean as diffuseur_widget,
  has_campaign_rights::boolean as diffuseur_campaign,
  deleted_at::timestamp as deleted_at,
  created_at::timestamp as created_at,
  updated_at::timestamp as updated_at
from {{ source('analytics_raw', 'publisher') }}
