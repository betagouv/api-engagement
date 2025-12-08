with campaign as (
  select
    id,
    url,
    name,
    diffuseur_id,
    annonceur_id,
    active,
    deleted_at,
    created_at,
    updated_at,
    reassigned_at,
    reassigned_by_user_id,
    type
  from {{ ref('stg_campaign') }}
),

user_lookup as (
  select
    id,
    nullif(trim(concat_ws(' ', first_name, last_name)), '') as full_name
  from {{ ref('stg_user') }}
)

select
  c.id,
  c.url,
  c.name,
  c.diffuseur_id,
  c.annonceur_id,
  c.active,
  c.deleted_at,
  c.created_at,
  c.updated_at,
  c.reassigned_at,
  c.reassigned_by_user_id,
  u.full_name as reassigned_by_user_name,
  c.type
from campaign as c
left join user_lookup as u on c.reassigned_by_user_id = u.id
