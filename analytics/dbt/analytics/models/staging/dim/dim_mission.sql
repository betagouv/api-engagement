with base as (
  select
    m.id,
    nullif(m.old_id, '') as mission_id_raw,
    nullif(m.client_id, '') as client_id,
    nullif(m.partner_id::text, '') as publisher_id
  from {{ source('public', 'Mission') }} as m
)

select * from base
