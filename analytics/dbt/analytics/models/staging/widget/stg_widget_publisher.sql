{{ config(materialized = 'view') }}

select
  widget_id,
  publisher_id,
  created_at
from {{ source('analytics_raw', 'widget_publisher') }}
