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
    finished_at
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
  finished_at as ended_at
from source
