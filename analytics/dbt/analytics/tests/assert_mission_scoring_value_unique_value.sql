-- Grain de mission_scoring_value : une ligne par scoring et par valeur de
-- taxonomie (dernier passage seul).
select
  mission_scoring_id,
  taxonomy_key,
  value_key
from {{ ref('mission_scoring_value') }}
group by mission_scoring_id, taxonomy_key, value_key
having count(*) > 1
