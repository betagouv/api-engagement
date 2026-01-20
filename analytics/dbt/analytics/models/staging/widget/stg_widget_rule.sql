{{ config(materialized = 'view') }}

select
  id,
  widget_id,
  field,
  field_type,
  operator,
  value,
  combinator,
  position,
  created_at,
  updated_at
from {{ source('analytics_raw', 'widget_rule') }}
