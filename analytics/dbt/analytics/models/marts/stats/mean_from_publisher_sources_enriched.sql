{{ config(materialized = 'view') }}

select
  ms.mean_date,
  ms.from_publisher_id,
  ms.source,
  ms.source_id,
  ms.print_count,
  ms.click_count,
  ms.account_count,
  ms.apply_count,
  ms.total_count,
  ms.conversion_rate,
  coalesce(
    nullif(
      btrim(
        case
          when ms.source = 'widget' then w.name
          when ms.source = 'campaign' then c.name
          when ms.source = 'api' then p.name
        end
      ),
      ''
    ),
    ms.source_id
  ) as source_name
from {{ ref('mean_from_publisher_sources') }} as ms
left join {{ ref('widget') }} as w
  on
    ms.source = 'widget'
    and ms.source_id = w.id
left join {{ ref('campaign') }} as c
  on
    ms.source = 'campaign'
    and ms.source_id = c.id
left join {{ ref('publisher') }} as p
  on
    ms.source = 'api'
    and ms.source_id = p.id
