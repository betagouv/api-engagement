with funnel as (
  select
    session_date as kpi_date,
    step_index,
    max(step_name) as step_name,
    count(distinct quiz_attempt_id) as sessions_reaching_step
  from {{ ref('int_tracking_quiz_funnel_step') }}
  where session_date is not null and step_index is not null
  group by session_date, step_index
),

started as (
  select
    session_date as kpi_date,
    count(distinct quiz_attempt_id) as sessions_started
  from {{ ref('int_tracking_quiz_session') }}
  where session_date is not null
  group by session_date
)

select
  f.kpi_date,
  f.step_index,
  f.step_name,
  st.sessions_started,
  f.sessions_reaching_step,
  lag(f.sessions_reaching_step) over (
    partition by f.kpi_date order by f.step_index
  ) as sessions_reaching_previous,
  f.sessions_reaching_step::numeric
  / nullif(
    lag(f.sessions_reaching_step) over (
      partition by f.kpi_date order by f.step_index
    ),
    0
  ) as step_retention_rate,
  f.sessions_reaching_step::numeric
  / nullif(st.sessions_started, 0) as overall_reach_rate
from funnel as f
left join started as st on f.kpi_date = st.kpi_date
