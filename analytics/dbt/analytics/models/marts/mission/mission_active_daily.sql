{{ config(materialized = 'view') }}

select *
from {{ ref('int_mission_active_daily') }}
