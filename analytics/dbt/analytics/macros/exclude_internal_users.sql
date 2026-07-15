{% macro exclude_internal_users(column_name='is_internal_user') %}
not coalesce({{ column_name }}, false)
{% endmacro %}
