-- Invariant de cohérence du filtrage interne (résolu au niveau `distinct_id`) :
-- toute session portant un clic depuis les résultats (`entry_page = 'results'`)
-- DOIT avoir `has_click_after_results = true` dans `tracking_quiz_session`.
-- Autrement dit, l'ensemble des sessions avec clic depuis résultats est un
-- sous-ensemble des sessions avec clic et ne peut jamais être plus grand.
-- Le test échoue s'il remonte des lignes (invariant violé).
with sessions as (
  select
    quiz_session_id,
    has_click_after_results
  from {{ ref('tracking_quiz_session') }}
),

results_clicks as (
  select distinct quiz_session_id
  from {{ ref('tracking_mission_click') }}
  where entry_page = 'results'
)

select s.quiz_session_id
from sessions as s
inner join results_clicks as c on s.quiz_session_id = c.quiz_session_id
where not s.has_click_after_results
