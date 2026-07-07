with results as (
  select
    session_date as kpi_date,
    count(*) as results_viewed_count,
    count(*) filter (where has_click_pinned) as sessions_with_pinned_click,
    count(*) filter (where is_zero_click) as zero_click_sessions,
    avg(avg_distance_km_top5) as avg_distance_km_top5,
    avg(click_count) as avg_clicks_per_session
  from {{ ref('int_tracking_results_session') }}
  where session_date is not null
  group by session_date
),

clicks as (
  select
    session_date as kpi_date,
    count(*) as click_count,
    count(*) filter (where rank = 1) as rank_1_clicks,
    count(*) filter (where rank = 2) as rank_2_clicks,
    count(*) filter (where rank = 3) as rank_3_clicks,
    count(*) filter (where rank = 4) as rank_4_clicks,
    count(*) filter (where rank = 5) as rank_5_clicks,
    count(*) filter (where rank >= 6) as rank_6plus_clicks
  from {{ ref('int_tracking_mission_click') }}
  where session_date is not null and section in ('pinned', 'other')
  group by session_date
),

backend as (
  select
    session_date as kpi_date,
    avg(score_top5) as avg_score_top5
  from {{ ref('int_tracking_quiz_backend') }}
  where session_date is not null
  group by session_date
)

select
  r.kpi_date,
  r.results_viewed_count,
  r.avg_distance_km_top5,
  r.avg_clicks_per_session,
  b.avg_score_top5,
  r.sessions_with_pinned_click::numeric
  / nullif(r.results_viewed_count, 0) as pinned_click_rate,
  r.zero_click_sessions::numeric
  / nullif(r.results_viewed_count, 0) as zero_click_rate,
  c.rank_1_clicks::numeric / nullif(c.click_count, 0) as click_share_rank_1,
  c.rank_2_clicks::numeric / nullif(c.click_count, 0) as click_share_rank_2,
  c.rank_3_clicks::numeric / nullif(c.click_count, 0) as click_share_rank_3,
  c.rank_4_clicks::numeric / nullif(c.click_count, 0) as click_share_rank_4,
  c.rank_5_clicks::numeric / nullif(c.click_count, 0) as click_share_rank_5,
  c.rank_6plus_clicks::numeric
  / nullif(c.click_count, 0) as click_share_rank_6plus
from results as r
left join clicks as c on r.kpi_date = c.kpi_date
left join backend as b on r.kpi_date = b.kpi_date
