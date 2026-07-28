-- Grain « une ligne par mission recommandée » exposé à Metabase pour agréger
-- librement la part des recommandations par annonceur (`publisher_name`), par
-- jour (`session_date`) ou par rang (`backend_rank`). Aucune pré-agrégation :
-- la souplesse d'agrégation est laissée à Metabase.
select
  quiz_session_id,
  session_date,
  matching_engine_version,
  backend_rank,
  mission_scoring_id,
  mission_id,
  publisher_id,
  publisher_name
from {{ ref('int_tracking_recommendation') }}
