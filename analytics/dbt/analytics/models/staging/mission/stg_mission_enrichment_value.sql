-- L'export vers analytics_raw est incrémental sur `updated_at` et ne voit
-- pas les suppressions. À chaque ré-enrichissement, la base core supprime
-- les valeurs puis insère celles du nouveau passage : les anciennes restent
-- dans analytics_raw. Les valeurs d'un passage partagent le même
-- `created_at` : on ne garde que le dernier passage de chaque enrichissement,
-- ce qui reproduit l'état de la base core.
with source_values as (
  select
    id,
    enrichment_id,
    taxonomy_key,
    value_key,
    confidence::double precision as confidence,
    evidence,
    created_at::timestamp as created_at,
    updated_at::timestamp as updated_at
  from {{ source('analytics_raw', 'mission_enrichment_value') }}
),

with_last_run as (
  select
    id,
    enrichment_id,
    taxonomy_key,
    value_key,
    confidence,
    evidence,
    created_at,
    updated_at,
    max(created_at) over (partition by enrichment_id) as last_run_created_at
  from source_values
)

select
  id,
  enrichment_id,
  taxonomy_key,
  value_key,
  confidence,
  evidence,
  created_at,
  updated_at
from with_last_run
where created_at = last_run_created_at
