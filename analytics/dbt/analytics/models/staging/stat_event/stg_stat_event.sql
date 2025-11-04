with base as (
  select
    id,
    type,
    created_at::timestamp as created_at,
    updated_at::timestamp as updated_at,
    host,
    source::text,
    source_id,
    from_publisher_id,
    to_publisher_id,
    mission_id,
    mission_client_id,
    tag,
    tags,
    status::text,
    referer,
    custom_attributes,
    is_bot::boolean as is_bot,
    is_human::boolean as is_human,
    coalesce(click_id, '') as click_id
  from {{ source('analytics_raw', 'StatEvent') }}
)

select * from base
