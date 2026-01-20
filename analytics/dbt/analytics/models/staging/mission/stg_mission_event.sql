with source as (
  select
    id,
    type::text as type,
    changes,
    created_by,
    created_at::timestamp as created_at,
    updated_at::timestamp as updated_at,
    mission_id
  from {{ source('analytics_raw', 'mission_event') }}
)

select
  s.id,
  s.mission_id,
  s.type,
  s.changes,
  s.created_by,
  s.created_at,
  s.updated_at
from source as s
