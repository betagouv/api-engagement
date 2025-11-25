{{ config(
    materialized = 'incremental',
    unique_key = 'id',
    on_schema_change = 'sync_all_columns'
) }}

with source as (
  select *
  from {{ ref('stg_organization') }}
  {% if is_incremental() %}
    where
      updated_at
      > (
        select coalesce(max(o.updated_at), '1900-01-01') from {{ this }} as o
      )
  {% endif %}
)

select * from source
