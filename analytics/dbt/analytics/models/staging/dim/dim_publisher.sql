select
  pub.id,
  p.id as partner_id,
  pub.name
from {{ ref('stg_publisher') }} as pub
left join {{ source('public', 'Partner') }} as p on pub.id = p.old_id
