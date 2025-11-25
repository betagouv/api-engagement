{% macro slugify(expression, null_if_empty=False) %}
  {%- set slug_expr -%}
(
  regexp_replace(
    regexp_replace(
      regexp_replace(
        regexp_replace(
          regexp_replace(
            regexp_replace(
              lower(
                translate(
                  coalesce({{ expression }}, ''),
                  'àáäâãåăæçèéëêǵḧìíïîḿńǹñòóöôœṕŕßśșțùúüûǘẃẍÿź·/_,:;',
                  'aaaaaaaaceeeeghiiiimnnnoooooprssstuuuuuwxyz------'
                )
              ),
              '\s+',
              '-',
              'g'
            ),
            '&',
            '-and-',
            'g'
          ),
          '[^\w\-]+',
          '',
          'g'
        ),
        '\-\-+',
        '-',
        'g'
      ),
      '^\-+',
      ''
    ),
    '\-+$',
    ''
  )
)
  {%- endset -%}

  {%- if null_if_empty -%}
(
  case
    when btrim(coalesce({{ expression }}, '')) = '' then null
    when btrim({{ slug_expr }}) = '' then null
    else {{ slug_expr }}
  end
)
  {%- else -%}
  {{ slug_expr }}
  {%- endif -%}
{% endmacro %}
