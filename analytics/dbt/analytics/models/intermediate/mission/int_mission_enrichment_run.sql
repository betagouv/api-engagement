{{ config(
  materialized = 'incremental',
  unique_key = 'id',
  incremental_strategy = 'delete+insert',
  on_schema_change = 'sync_all_columns',
  indexes = [{'columns': ['id'], 'unique': true}]
) }}

select
  r.id,
  r.mission_enrichment_id,
  e.mission_id,
  r.prompt_version,
  r.status,
  r.input_tokens,
  r.output_tokens,
  r.total_tokens,
  r.completed_at,
  r.created_at,
  r.updated_at
from {{ ref('stg_mission_enrichment_run') }} as r
left join {{ ref('stg_mission_enrichment') }} as e
  on r.mission_enrichment_id = e.id
{% if is_incremental() %}
  where
    r.updated_at
    >= (
      select coalesce(max(imer.updated_at), '1900-01-01')
      from {{ this }} as imer
    )
{% endif %}
