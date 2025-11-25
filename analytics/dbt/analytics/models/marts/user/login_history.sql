{{ config(
    materialized = 'incremental',
    unique_key = ['user_id', 'login_at'],
    on_schema_change = 'sync_all_columns'
) }}

with base as (
  select
    id as user_id,
    updated_at,
    login_at
  from {{ ref('stg_user') }}
  where
    login_at is not null
    {% if is_incremental() %}
      and updated_at
      > (
        select coalesce(max(lh.user_updated_at), '1900-01-01')
        from {{ this }} as lh
      )
    {% endif %}
),

exploded as (
  select
    user_id,
    updated_at as user_updated_at,
    unnest(login_at)::timestamp as login_at
  from base
)

select
  user_id,
  login_at,
  user_updated_at
from exploded
