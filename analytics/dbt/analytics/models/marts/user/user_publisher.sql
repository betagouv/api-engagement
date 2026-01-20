with source as (
  select *
  from {{ ref('stg_user_publisher') }}
)

select * from source
