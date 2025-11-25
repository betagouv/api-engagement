{{ config(
  materialized='incremental',
  unique_key=['kpi_date', 'is_bot_filtered'],
  on_schema_change = 'sync_all_columns'
) }}

with mission_source as (
  select *
  from {{ ref('stg_kpi__mission_daily') }}
  {% if is_incremental() %}
    where metric_date > (
      select coalesce(max(k.kpi_date), '1900-01-01')
      from {{ this }} as k
    )
  {% endif %}
),

event_source as (
  select *
  from {{ ref('stg_kpi__events_daily') }}
  {% if is_incremental() %}
    where metric_date > (
      select coalesce(max(k.kpi_date), '1900-01-01')
      from {{ this }} as k
    )
  {% endif %}
),

date_spine as (
  select metric_date
  from (
    select distinct metric_date from mission_source
    union
    select distinct metric_date from event_source
  ) as all_dates
  where metric_date <= (current_date - interval '1 day')
),

mission_stats as (
  select *
  from mission_source
  where metric_date in (
    select ds.metric_date
    from date_spine as ds
  )
),

event_stats as (
  select *
  from event_source
  where metric_date in (
    select ds.metric_date
    from date_spine as ds
  )
),

event_pivot as (
  select
    metric_date,
    is_bot_filtered,
    max(
      case
        when
          publisher_category = 'benevolat' and event_type = 'print'
          then mission_count
        else 0
      end
    ) as benevolat_print_mission_count,
    max(
      case
        when
          publisher_category = 'volontariat' and event_type = 'print'
          then mission_count
        else 0
      end
    ) as volontariat_print_mission_count,
    max(
      case
        when
          publisher_category = 'benevolat' and event_type = 'click'
          then mission_count
        else 0
      end
    ) as benevolat_click_mission_count,
    max(
      case
        when
          publisher_category = 'volontariat' and event_type = 'click'
          then mission_count
        else 0
      end
    ) as volontariat_click_mission_count,
    max(
      case
        when
          publisher_category = 'benevolat' and event_type = 'apply'
          then mission_count
        else 0
      end
    ) as benevolat_apply_mission_count,
    max(
      case
        when
          publisher_category = 'volontariat' and event_type = 'apply'
          then mission_count
        else 0
      end
    ) as volontariat_apply_mission_count,
    max(
      case
        when
          publisher_category = 'benevolat' and event_type = 'account'
          then mission_count
        else 0
      end
    ) as benevolat_account_mission_count,
    max(
      case
        when
          publisher_category = 'volontariat' and event_type = 'account'
          then mission_count
        else 0
      end
    ) as volontariat_account_mission_count,
    max(
      case
        when
          publisher_category = 'benevolat' and event_type = 'print'
          then event_count
        else 0
      end
    ) as benevolat_print_count,
    max(
      case
        when
          publisher_category = 'volontariat' and event_type = 'print'
          then event_count
        else 0
      end
    ) as volontariat_print_count,
    max(
      case
        when
          publisher_category = 'benevolat' and event_type = 'click'
          then event_count
        else 0
      end
    ) as benevolat_click_count,
    max(
      case
        when
          publisher_category = 'volontariat' and event_type = 'click'
          then event_count
        else 0
      end
    ) as volontariat_click_count,
    max(
      case
        when
          publisher_category = 'benevolat' and event_type = 'apply'
          then event_count
        else 0
      end
    ) as benevolat_apply_count,
    max(
      case
        when
          publisher_category = 'volontariat' and event_type = 'apply'
          then event_count
        else 0
      end
    ) as volontariat_apply_count,
    max(
      case
        when
          publisher_category = 'benevolat' and event_type = 'account'
          then event_count
        else 0
      end
    ) as benevolat_account_count,
    max(
      case
        when
          publisher_category = 'volontariat' and event_type = 'account'
          then event_count
        else 0
      end
    ) as volontariat_account_count
  from event_stats
  group by metric_date, is_bot_filtered
),

distinct_dates as (
  select metric_date from date_spine
),

scenarios as (
  select false as is_bot_filtered
  union all
  select true as is_bot_filtered
),

date_matrix as (
  select
    d.metric_date,
    s.is_bot_filtered
  from distinct_dates as d
  cross join scenarios as s
)

select
  dm.metric_date as kpi_date,
  dm.is_bot_filtered,
  coalesce(m.available_benevolat_mission_count, 0)
    as available_benevolat_mission_count,
  coalesce(m.available_volontariat_mission_count, 0)
    as available_volontariat_mission_count,
  coalesce(m.available_jva_mission_count, 0) as available_jva_mission_count,
  coalesce(m.available_benevolat_given_mission_count, 0)
    as available_benevolat_given_mission_count,
  coalesce(m.available_volontariat_given_mission_count, 0)
    as available_volontariat_given_mission_count,
  coalesce(m.available_benevolat_attributed_mission_count, 0)
    as available_benevolat_attributed_mission_count,
  coalesce(m.available_volontariat_attributed_mission_count, 0)
    as available_volontariat_attributed_mission_count,
  coalesce(m.available_benevolat_given_place_count, 0)
    as available_benevolat_given_place_count,
  coalesce(m.available_volontariat_given_place_count, 0)
    as available_volontariat_given_place_count,
  coalesce(m.available_benevolat_attributed_place_count, 0)
    as available_benevolat_attributed_place_count,
  coalesce(m.available_volontariat_attributed_place_count, 0)
    as available_volontariat_attributed_place_count,
  case
    when coalesce(m.available_benevolat_mission_count, 0) = 0 then 0
    else
      coalesce(m.available_benevolat_given_mission_count, 0)::double precision
      / nullif(m.available_benevolat_mission_count, 0)
  end as percentage_benevolat_given_places,
  case
    when coalesce(m.available_volontariat_mission_count, 0) = 0 then 0
    else
      coalesce(m.available_volontariat_given_mission_count, 0)::double precision
      / nullif(m.available_volontariat_mission_count, 0)
  end as percentage_volontariat_given_places,
  case
    when coalesce(m.available_benevolat_mission_count, 0) = 0 then 0
    else
      coalesce(
        m.available_benevolat_attributed_mission_count, 0
      )::double precision
      / nullif(m.available_benevolat_mission_count, 0)
  end as percentage_benevolat_attributed_places,
  case
    when coalesce(m.available_volontariat_mission_count, 0) = 0 then 0
    else
      coalesce(
        m.available_volontariat_attributed_mission_count, 0
      )::double precision
      / nullif(m.available_volontariat_mission_count, 0)
  end as percentage_volontariat_attributed_places,
  coalesce(e.benevolat_print_mission_count, 0) as benevolat_print_mission_count,
  coalesce(e.volontariat_print_mission_count, 0)
    as volontariat_print_mission_count,
  coalesce(e.benevolat_click_mission_count, 0) as benevolat_click_mission_count,
  coalesce(e.volontariat_click_mission_count, 0)
    as volontariat_click_mission_count,
  coalesce(e.benevolat_apply_mission_count, 0) as benevolat_apply_mission_count,
  coalesce(e.volontariat_apply_mission_count, 0)
    as volontariat_apply_mission_count,
  coalesce(e.benevolat_account_mission_count, 0)
    as benevolat_account_mission_count,
  coalesce(e.volontariat_account_mission_count, 0)
    as volontariat_account_mission_count,
  coalesce(e.benevolat_print_count, 0) as benevolat_print_count,
  coalesce(e.volontariat_print_count, 0) as volontariat_print_count,
  coalesce(e.benevolat_click_count, 0) as benevolat_click_count,
  coalesce(e.volontariat_click_count, 0) as volontariat_click_count,
  coalesce(e.benevolat_apply_count, 0) as benevolat_apply_count,
  coalesce(e.volontariat_apply_count, 0) as volontariat_apply_count,
  coalesce(e.benevolat_account_count, 0) as benevolat_account_count,
  coalesce(e.volontariat_account_count, 0) as volontariat_account_count
from date_matrix as dm
left join mission_stats as m on dm.metric_date = m.metric_date
left join
  event_pivot as e
  on dm.metric_date = e.metric_date and dm.is_bot_filtered = e.is_bot_filtered
