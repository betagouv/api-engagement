with base as (
  select
    m.id,
    nullif(m.old_id, '') as mission_id_raw,
    nullif(m.client_id, '') as client_id,
    nullif(p.old_id, '') as publisher_id_raw
  from {{ source('public', 'Mission') }} as m
  left join {{ source('public', 'Partner') }} as p on m.partner_id = p.id
)

select * from base
