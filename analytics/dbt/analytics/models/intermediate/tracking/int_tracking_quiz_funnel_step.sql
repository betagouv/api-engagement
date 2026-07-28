with steps as (
  select
    quiz_attempt_id,
    distinct_id,
    step_name,
    step_index,
    total_visible_steps,
    quiz_path,
    answer_value,
    event_at as completed_at,
    event_at::date as session_date
  from {{ ref('stg_tracking__quiz_step_completed') }}
  where quiz_attempt_id is not null
)

select
  quiz_attempt_id,
  step_name,
  step_index,
  total_visible_steps,
  quiz_path,
  answer_value,
  completed_at,
  session_date
from steps
where {{ exclude_internal_distinct_ids('distinct_id') }}
