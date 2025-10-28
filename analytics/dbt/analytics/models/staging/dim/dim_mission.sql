with base as (
  select
    m.id,
    nullif(m.old_id, '') as old_id,
    nullif(m.client_id, '') as client_id,
    nullif(p.old_id, '') as partner_old_id
  from {{ source('public', 'Mission') }} as m
  left join {{ source('public', 'Partner') }} as p on m.partner_id = p.id
)

select * from base
