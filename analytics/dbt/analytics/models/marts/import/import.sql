{{ config(
    materialized = 'incremental',
    unique_key = 'id',
    on_schema_change = 'sync_all_columns'
) }}

with source as (
  select
    id,
    created_count,
    deleted_count,
    updated_count,
    publisher_id,
    started_at,
    finished_at,
    status,
    error
  from {{ ref('stg_import') }}
  {% if is_incremental() %}
    where
      started_at
      > (select coalesce(max(i.started_at), '1900-01-01') from {{ this }} as i)
  {% endif %}
)

select
  id,
  created_count,
  deleted_count,
  updated_count,
  publisher_id,
  started_at,
  finished_at as ended_at,
  status,
  case
    when status <> 'FAILED' or error is null then null
    when error ilike '%No feed' then 'no_feed'
    when error ilike '%Unsafe feed URL' then 'unsafe_feed_url'
    when error ilike '%Failed to fetch XML' then 'fetch_failed'
    when error ~ '^(401|403) - ' then 'http_auth'
    when error ~ '^404 - ' then 'http_not_found'
    when error ~ '^4[0-9][0-9] - ' then 'http_client_error'
    when error ~ '^5[0-9][0-9] - ' then 'http_server_error'
    when error = 'Empty xml' then 'empty_xml'
    when error in ('Error parsing xml', 'Not an XML') then 'parse_error'
    else 'internal_error'
  end as error_type
from source
