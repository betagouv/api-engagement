-- Référentiel des `distinct_id` internes (équipe API Engagement).
-- Un `distinct_id` est interne dès qu'il a émis AU MOINS un event avec
-- `internal_user = true`. L'internalité est résolue au niveau de la PERSONNE
-- (et non de l'event ni de la session) : tous les events d'un `distinct_id`
-- interne sont exclus, y compris ceux émis avant qu'il ne se flague.
select distinct distinct_id
from {{ ref('stg_tracking__event') }}
where
  is_internal_user
  and distinct_id is not null
