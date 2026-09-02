with sessions as (
  select
    session_date as kpi_date,
    count(*) as quiz_started_count,
    count(*) filter (where is_completed) as quiz_completed_count,
    count(*) filter (where completion_type = 'shortcut') as shortcut_count,
    count(*) filter (where entry_source = 'change_results_cta')
      as change_results_count
  from {{ ref('int_tracking_quiz_session') }}
  where session_date is not null
  group by session_date
),

results as (
  select
    session_date as kpi_date,
    count(*) as results_viewed_count,
    count(*) filter (where has_click_after_results)
      as sessions_with_click_after_results,
    count(*) filter (where has_click_results) as sessions_with_click_results,
    count(*) filter (where has_click_external) as sessions_with_external
  from {{ ref('int_tracking_results_session') }}
  where session_date is not null
  group by session_date
),

pages as (
  select
    kpi_date,
    sum(pageview_count) filter (where page_name = 'homepage')
      as home_pageview_count
  from {{ ref('tracking_page_view_daily') }}
  group by kpi_date
),

backend as (
  select
    session_date as kpi_date,
    count(*) filter (where has_backend_click) as sessions_with_backend_click,
    count(*) filter (where has_apply) as sessions_with_apply,
    sum(apply_count) as apply_count
  from {{ ref('int_tracking_quiz_backend') }}
  where session_date is not null
  group by session_date
)

select
  s.kpi_date,
  s.quiz_started_count,
  s.quiz_completed_count,
  p.home_pageview_count,
  coalesce(r.results_viewed_count, 0) as results_viewed_count,
  coalesce(r.sessions_with_click_after_results, 0)
    as sessions_with_click_after_results,
  s.quiz_completed_count::numeric
  / nullif(s.quiz_started_count, 0) as completion_rate,
  coalesce(r.sessions_with_click_after_results, 0)::numeric
  / nullif(s.quiz_started_count, 0) as quiz_to_click_rate,
  coalesce(r.sessions_with_click_results, 0)::numeric
  / nullif(r.results_viewed_count, 0) as results_click_rate,
  coalesce(r.sessions_with_external, 0)::numeric
  / nullif(s.quiz_completed_count, 0) as external_access_rate,
  s.shortcut_count::numeric
  / nullif(s.quiz_started_count, 0) as shortcut_rate,
  s.change_results_count::numeric
  / nullif(r.results_viewed_count, 0) as change_results_rate,
  s.quiz_started_count::numeric
  / nullif(p.home_pageview_count, 0) as quiz_start_rate,
  coalesce(bk.sessions_with_backend_click, 0) as sessions_with_backend_click,
  coalesce(bk.sessions_with_apply, 0) as sessions_with_apply,
  coalesce(bk.apply_count, 0) as apply_count,
  coalesce(bk.sessions_with_apply, 0)::numeric
  / nullif(s.quiz_started_count, 0) as quiz_to_apply_rate,
  coalesce(bk.sessions_with_apply, 0)::numeric
  / nullif(r.sessions_with_click_after_results, 0) as click_to_apply_rate
from sessions as s
left join results as r on s.kpi_date = r.kpi_date
left join pages as p on s.kpi_date = p.kpi_date
left join backend as bk on s.kpi_date = bk.kpi_date
order by s.kpi_date desc
