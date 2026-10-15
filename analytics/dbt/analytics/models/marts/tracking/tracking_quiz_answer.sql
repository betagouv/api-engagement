-- Dernière réponse par (tentative, étape) : un retour arrière ré-émet l'étape.
with last_answers as (
  select distinct on (quiz_attempt_id, step_name)
    quiz_attempt_id,
    quiz_version,
    device_type,
    event_at as answered_at,
    step_name,
    step_index,
    answer_value,
    case when step_name = 'localisation' then geo_postcode end as geo_postcode
  from {{ ref('stg_tracking__quiz_step_completed') }}
  where
    quiz_attempt_id is not null
    and step_name is not null
    and not is_internal_user
    and {{ exclude_internal_distinct_ids('distinct_id') }}
  order by quiz_attempt_id asc, step_name asc, event_at desc, event_uuid desc
),

-- Choix multiples dépliés : une ligne par option. Une réponse vide ou nulle
-- garde une ligne (option nulle) pour compter la tentative comme répondante.
-- `localisation` : `answer_value` est l'adresse saisie, jamais exposée (seuls
-- le code postal et le département le sont).
answers as (
  select
    la.quiz_attempt_id,
    la.quiz_version,
    la.device_type,
    la.answered_at,
    la.step_name,
    la.step_index,
    la.geo_postcode,
    la.answer_value like '[%' as is_multiple_choice,
    case
      when la.step_name = 'localisation' then null
      when la.answer_value like '[%' then opt.answer_option
      else nullif(la.answer_value, '')
    end as answer_option
  from last_answers as la
  left join lateral jsonb_array_elements_text(
    case when la.answer_value like '[%' then la.answer_value::jsonb end
  ) as opt (answer_option) on true
),

-- Même règle que `int_tracking_quiz_session` (CTE `geo`).
geo as (
  select
    *,
    case
      when geo_postcode ~ '^(97[1-8]|98[4-9])' then left(geo_postcode, 3)
      when left(geo_postcode, 2) = '20'
        then case
          when substr(geo_postcode, 1, 3)::int < 202 then '2A'
          else '2B'
        end
      else left(geo_postcode, 2)
    end as department_code
  from answers
)

select
  g.quiz_attempt_id
  || '|' || g.step_name
  || '|' || coalesce(g.answer_option, '') as answer_key,
  g.quiz_attempt_id,
  -- `cookieless:` n'est posé que sur les tentatives reconstituées depuis la
  -- session PostHog (voir `stg_tracking__event`).
  case
    when g.quiz_attempt_id like 'cookieless:%' then 'session'
    else 'property'
  end as quiz_attempt_id_source,
  g.quiz_attempt_id like 'cookieless:%' as is_cookieless_attempt,
  g.quiz_version,
  g.device_type,
  g.answered_at,
  g.answered_at::date as answer_date,
  g.step_name,
  g.step_index,
  g.answer_option,
  g.is_multiple_choice,
  g.geo_postcode,
  g.department_code,
  dc.department_name,
  dc.region_code,
  dc.region_name
from geo as g
left join {{ ref('department_codes') }} as dc
  on g.department_code = dc.department_code
