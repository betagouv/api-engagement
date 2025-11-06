select
  id,
  old_id as widget_id_raw
from {{ source('public', 'Widget') }}
