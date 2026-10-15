{% macro geo_region_name(
  country_code_column, region_code_column, region_name_column
) %}
{#-
  Nom de la région d'une géolocalisation IP PostHog (base MaxMind). En France,
  MaxMind renvoie un code ISO 3166-2 à jour (`IDF`, `ARA`...) mais des libellés
  mêlant anglais et anciennes régions (« Brittany », « Rhône-Alpes ») : on
  remet le nom officiel, identique à celui du seed `department_codes`. Hors de
  France (DROM compris, que MaxMind classe sous leur propre code pays) ou code
  inconnu : libellé MaxMind brut.
  Parenthèses autour du `is distinct from` : sans elles, SQLFluff 4 ne parse
  pas la condition dans un `case when`.
-#}
case
  when ({{ country_code_column }} is distinct from 'FR')
    then {{ region_name_column }}
  when {{ region_code_column }} = 'ARA' then 'Auvergne-Rhône-Alpes'
  when {{ region_code_column }} = 'BFC' then 'Bourgogne-Franche-Comté'
  when {{ region_code_column }} = 'BRE' then 'Bretagne'
  when {{ region_code_column }} = 'CVL' then 'Centre-Val de Loire'
  when {{ region_code_column }} = 'COR' then 'Corse'
  when {{ region_code_column }} = 'GES' then 'Grand Est'
  when {{ region_code_column }} = 'HDF' then 'Hauts-de-France'
  when {{ region_code_column }} = 'IDF' then 'Île-de-France'
  when {{ region_code_column }} = 'NOR' then 'Normandie'
  when {{ region_code_column }} = 'NAQ' then 'Nouvelle-Aquitaine'
  when {{ region_code_column }} = 'OCC' then 'Occitanie'
  when {{ region_code_column }} = 'PDL' then 'Pays de la Loire'
  when {{ region_code_column }} = 'PAC' then 'Provence-Alpes-Côte d''Azur'
  else {{ region_name_column }}
end
{%- endmacro %}
