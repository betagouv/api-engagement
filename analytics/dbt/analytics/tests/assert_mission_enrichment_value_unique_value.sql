-- Grain de mission_enrichment_value : une ligne par enrichissement et par
-- valeur de taxonomie (dernier passage seul).
select
  enrichment_id,
  taxonomy_key,
  value_key
from {{ ref('mission_enrichment_value') }}
group by enrichment_id, taxonomy_key, value_key
having count(*) > 1
