{{ config(
  materialized = 'table',
  unique_key = 'id',
  on_schema_change = 'sync_all_columns'
) }}

with widgets as (
  select *
  from {{ ref('stg_widget') }}
),

publishers as (
  select
    widget_id,
    count(*) as publisher_count
  from {{ ref('stg_widget_publisher') }}
  group by widget_id
),

rule_counts as (
  select
    widget_id,
    count(*) as rule_count
  from {{ ref('stg_widget_rule') }}
  group by widget_id
)

select
  w.id,
  w.name,
  w.color,
  w.style,
  w.type as mission_type,
  w.location_lat,
  w.location_long,
  w.location_city,
  w.distance,
  w.url,
  w.jva_moderation,
  w.from_publisher_id as diffuseur_id,
  w.active,
  w.deleted_at,
  w.created_at,
  w.updated_at,
  coalesce(p.publisher_count, 0) as publisher_count,
  coalesce(rc.rule_count, 0) as rule_count,
  (w.deleted_at is not null) as is_deleted
from widgets as w
left join publishers as p on w.id = p.widget_id
left join rule_counts as rc on w.id = rc.widget_id
