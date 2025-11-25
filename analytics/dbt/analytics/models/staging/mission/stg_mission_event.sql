with source as (
  select
    id,
    type::text as type,
    changes,
    created_by,
    created_at::timestamp as created_at,
    updated_at::timestamp as updated_at,
    nullif(mission_id, '') as mission_id_raw_input
  from {{ source('analytics_raw', 'mission_event') }}
),

missions as (
  select
    id as mission_id,
    nullif(old_id, '') as mission_id_raw
  from {{ source('public', 'Mission') }}
)

select
  s.id,
  m.mission_id,
  m.mission_id_raw,
  s.type,
  s.changes,
  s.created_by,
  s.created_at,
  s.updated_at
from source as s
inner join missions as m on s.mission_id_raw_input = m.mission_id_raw
