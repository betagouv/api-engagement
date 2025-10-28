select
  id,
  old_id
from {{ source('public', 'Campaign') }}
