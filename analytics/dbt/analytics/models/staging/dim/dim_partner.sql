select
  id,
  old_id
from {{ source('public', 'Partner') }}
