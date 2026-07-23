{% macro exclude_internal_distinct_ids(column_name='distinct_id') %}
{#-
  Exclusion NULL-safe des personnes internes, résolue au niveau du `distinct_id`
  via le référentiel `int_internal_distinct_ids`.
  Les events sans `distinct_id` (anonymes) sont conservés : ils ne peuvent être
  rattachés à aucun membre de l'équipe.
-#}
(
  {{ column_name }} is null
  or {{ column_name }} not in (
    select distinct_id from {{ ref('int_internal_distinct_ids') }}
  )
)
{% endmacro %}
