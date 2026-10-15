-- Une ligne par étape atteinte (validée au moins une fois) : un retour arrière
-- ré-émet l'étape, on garde la première validation et on compte les autres.
-- Pas de liste d'étapes en dur : une nouvelle étape apparaît d'elle-même.
with steps as (
  select
    quiz_attempt_id,
    step_name,
    min(completed_at) as first_completed_at,
    count(*) as completion_count,
    (array_agg(step_index order by completed_at asc))[1] as step_index,
    (array_agg(total_visible_steps order by completed_at asc))[1]
      as total_visible_steps
  from {{ ref('int_tracking_quiz_funnel_step') }}
  where step_name is not null
  group by quiz_attempt_id, step_name
)

select
  st.quiz_attempt_id || '|' || st.step_name as step_key,
  st.quiz_attempt_id,
  st.step_name,
  st.step_index,
  st.total_visible_steps,
  st.first_completed_at,
  st.completion_count,
  qs.session_date,
  qs.quiz_version,
  qs.device_type,
  qs.entry_source,
  qs.is_cookieless_attempt,
  qs.is_completed,
  qs.completion_type,
  qs.last_step_name,
  coalesce(
    qs.completion_type = 'shortcut' and st.step_name = qs.last_step_name,
    false
  ) as is_shortcut_exit_step
from steps as st
inner join {{ ref('int_tracking_quiz_session') }} as qs
  on st.quiz_attempt_id = qs.quiz_attempt_id
