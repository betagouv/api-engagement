with base as (
  select
    m.id,
    nullif(m.old_id, '') as mission_id_raw,
    nullif(m.client_id, '') as client_id,
    nullif(p.id::text, '') as publisher_id
  from {{ source('public', 'Mission') }} as m
  left join {{ ref('dim_publisher') }} as p on m.partner_id = p.partner_id
)

select * from base
