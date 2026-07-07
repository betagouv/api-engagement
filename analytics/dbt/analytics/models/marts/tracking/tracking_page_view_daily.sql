with page_views as (
  select
    session_date as kpi_date,
    page_name,
    count(*) as pageview_count,
    count(distinct distinct_id) as unique_visitor_count
  from {{ ref('int_tracking_page_view') }}
  where session_date is not null
  group by session_date, page_name
)

select
  kpi_date,
  page_name,
  pageview_count,
  unique_visitor_count
from page_views
