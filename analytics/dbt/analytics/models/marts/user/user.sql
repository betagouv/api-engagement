with source as (
  select
    id,
    first_name,
    last_name,
    email,
    role,
    deleted_at,
    last_activity_at,
    created_at,
    updated_at
  from {{ ref('stg_user') }}
)

select * from source
