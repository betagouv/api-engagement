with source as (
  select
    id,
    mission_id,
    created_at::timestamp as created_at,
    updated_at::timestamp as updated_at,
    moderator_id,
    user_name,
    initial_status::text as initial_status,
    new_status::text as new_status,
    initial_comment,
    new_comment,
    initial_note,
    new_note,
    initial_title,
    new_title,
    initial_siren,
    new_siren,
    initial_rna,
    new_rna
  from {{ source('analytics_raw', 'moderation_event') }}
)

select * from source
