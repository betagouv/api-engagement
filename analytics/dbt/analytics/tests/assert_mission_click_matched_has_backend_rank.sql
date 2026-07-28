-- Un clic rattaché au backend doit toujours porter un rang, une version et un
-- score. Échoue s'il remonte des lignes (invariant de la jointure violé).
select
  event_uuid,
  quiz_session_id,
  mission_id
from {{ ref('int_tracking_mission_click') }}
where
  matched_to_backend
  and (
    backend_rank is null
    or matching_engine_version is null
    or mission_score is null
  )
