select
  id,
  old_id as publisher_id_raw,
  name
from {{ source('public', 'Partner') }}
