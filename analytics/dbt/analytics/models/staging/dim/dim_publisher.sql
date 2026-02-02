select
  pub.id,
  pub.name
from {{ ref('stg_publisher') }} as pub
