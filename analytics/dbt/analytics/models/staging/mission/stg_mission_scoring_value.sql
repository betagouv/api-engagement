-- L'export vers analytics_raw est incrémental sur `updated_at` et ne voit
-- pas les suppressions. À chaque re-scoring, la base core remplace les
-- valeurs (les valeurs issues du LLM partent en cascade avec les valeurs
-- d'enrichissement) : les anciennes restent dans analytics_raw. Les valeurs
-- d'un passage partagent le même `created_at` : on ne garde que le dernier
-- passage de chaque scoring. Les valeurs de règles déterministes
-- (`mission_enrichment_value_id` null) font partie du même passage.
-- Avant la v1.20.0 (août 2026), un ré-enrichissement ne relançait pas le
-- scoring : la base core a supprimé par cascade les valeurs issues du LLM
-- sans nouveau passage. On écarte donc aussi, après le filtre du dernier
-- passage, les valeurs dont la valeur d'enrichissement n'est plus au
-- dernier passage, ce qui reproduit l'état de la base core.
with source_values as (
  select
    id,
    mission_scoring_id,
    mission_enrichment_value_id,
    taxonomy_key,
    value_key,
    score::double precision as score,
    created_at::timestamp as created_at,
    updated_at::timestamp as updated_at
  from {{ source('analytics_raw', 'mission_scoring_value') }}
),

with_last_run as (
  select
    id,
    mission_scoring_id,
    mission_enrichment_value_id,
    taxonomy_key,
    value_key,
    score,
    created_at,
    updated_at,
    max(created_at) over (
      partition by mission_scoring_id
    ) as last_run_created_at
  from source_values
),

last_run as (
  select
    id,
    mission_scoring_id,
    mission_enrichment_value_id,
    taxonomy_key,
    value_key,
    score,
    created_at,
    updated_at
  from with_last_run
  where created_at = last_run_created_at
),

current_enrichment_values as (
  select id
  from {{ ref('stg_mission_enrichment_value') }}
)

select
  last_run.id,
  last_run.mission_scoring_id,
  last_run.mission_enrichment_value_id,
  last_run.taxonomy_key,
  last_run.value_key,
  last_run.score,
  last_run.created_at,
  last_run.updated_at
from last_run
left join current_enrichment_values
  on last_run.mission_enrichment_value_id = current_enrichment_values.id
where
  last_run.mission_enrichment_value_id is null
  or current_enrichment_values.id is not null
