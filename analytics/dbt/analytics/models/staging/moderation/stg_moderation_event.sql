with source as (
  select
    id,
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
    new_rna,
    mission_id
  from {{ source('analytics_raw', 'moderation_event') }}
)

select
  s.id,
  s.mission_id,
  s.created_at,
  s.updated_at,
  s.moderator_id,
  s.user_name,
  s.initial_status,
  s.new_status,
  s.initial_comment,
  s.new_comment,
  s.initial_note,
  s.new_note,
  s.initial_title,
  s.new_title,
  s.initial_siren,
  s.new_siren,
  s.initial_rna,
  s.new_rna
from source as s
