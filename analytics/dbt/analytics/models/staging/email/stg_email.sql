with base as (
  select
    id,
    message_id,
    in_reply_to,
    from_name,
    from_email,
    subject,
    sent_at::timestamp as sent_at,
    status::text as status,
    date_from::timestamp as date_from,
    date_to::timestamp as date_to,
    created_count,
    deleted_at::timestamp as deleted_at,
    created_at::timestamp as created_at,
    updated_at::timestamp as updated_at
  from {{ source('analytics_raw', 'email') }}
)

select * from base
