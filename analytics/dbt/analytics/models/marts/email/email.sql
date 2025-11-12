{{ config(
    materialized = 'incremental',
    unique_key   = 'id',
    on_schema_change = 'sync_all_columns',
    post_hook = [
      'create index if not exists "email_status_idx" on {{ this }} (status)',
      'create index if not exists "email_date_from_to_idx" on {{ this }} (date_from, date_to)',
    ]
) }}

with src as (
  select *
  from {{ ref('stg_email') }}
  {% if is_incremental() %}
    where
      updated_at
      > (
        select coalesce(max(e.updated_at), '1900-01-01'::timestamp)
        from {{ this }} as e
      )
  {% endif %}
)

select
  id,
  message_id,
  in_reply_to,
  from_name,
  from_email,
  subject,
  sent_at,
  status,
  date_from,
  date_to,
  created_count,
  deleted_at,
  created_at,
  updated_at
from src
