select
  id,
  old_id as publisher_id_raw
from {{ source('public', 'Partner') }}
