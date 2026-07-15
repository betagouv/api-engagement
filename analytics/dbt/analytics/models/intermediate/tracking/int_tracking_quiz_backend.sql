with sessions as (
  select
    quiz_session_id,
    min(event_at)::date as session_date,
    max(distinct_id) as distinct_id,
    bool_or(is_internal_user) as is_internal_user
  from {{ ref('stg_tracking__quiz_completed') }}
  where quiz_session_id is not null
  group by quiz_session_id
),

latest_result as (
  select distinct on (user_scoring_id)
    user_scoring_id,
    matching_engine_version,
    results
  from {{ ref('matching_engine_result') }}
  where results is not null
  order by user_scoring_id asc, created_at desc
),

backend_scoring as (
  select
    lr.user_scoring_id as quiz_session_id,
    avg(
      (
        select avg(jt.value::numeric)
        from jsonb_each_text(t.elem -> 'taxonomyScores') as jt
      )
    ) as score_top5,
    max(lr.matching_engine_version) as matching_engine_version
  from latest_result as lr
  cross join
    lateral jsonb_array_elements(lr.results)
    with ordinality as t (elem, ord)
  where t.ord <= 5
  group by lr.user_scoring_id
)

select
  s.quiz_session_id,
  s.distinct_id,
  s.session_date,
  bsc.matching_engine_version,
  bsc.score_top5,
  null::boolean as has_apply,
  0::integer as apply_count,
  null::timestamp as first_apply_at
from sessions as s
left join backend_scoring as bsc on s.quiz_session_id = bsc.quiz_session_id
where {{ exclude_internal_users('s.is_internal_user') }}
