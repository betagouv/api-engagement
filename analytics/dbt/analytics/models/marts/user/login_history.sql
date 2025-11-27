{{ config(
    materialized = 'incremental',
    unique_key = ['user_id', 'login_at'],
    on_schema_change = 'sync_all_columns'
) }}

with base as (
  select
    user_id,
    login_at,
    created_at
  from {{ ref('stg_login_history') }}
  {% if is_incremental() %}
    where created_at > (
      select coalesce(max(lh.created_at), '1900-01-01')
      from {{ this }} as lh
    )
  {% endif %}
)

select
  user_id,
  login_at
from base
