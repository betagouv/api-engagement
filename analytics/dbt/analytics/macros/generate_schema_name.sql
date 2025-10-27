{# analytics/dbt/analytics/macros/generate_schema_name.sql
  We override dbt's default schema selection so any model that does not
  explicitly set +schema keeps the environment schema (target.schema). 
  This prevents dbt from inventing per-model schemas, which would bypass
  our managed schemas and break grants. #}
{% macro generate_schema_name(custom_schema_name=none, node=none) -%}
    {%- if custom_schema_name is not none and custom_schema_name | trim != '' -%}
      {{ custom_schema_name | trim }}
    {%- else -%}
      {{ target.schema }}
    {%- endif -%}
{%- endmacro %}
