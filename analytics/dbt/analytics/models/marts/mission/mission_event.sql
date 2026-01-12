{{ config(
    materialized = 'incremental',
    unique_key = 'id',
    on_schema_change = 'sync_all_columns',
    post_hook = [
      'create index if not exists "mission_event_mission_id_idx" on {{ this }} (mission_id)',
    ]
) }}

with source as (
  select *
  from {{ ref('stg_mission_event') }}
  {% if is_incremental() %}
    where
      updated_at
      > (
        select coalesce(max(me.updated_at), '1900-01-01') from {{ this }} as me
      )
  {% endif %}
),

publisher_jva as (
  select old_id as jva_old_id
  from {{ source('public', 'Partner') }}
  where name = '{{ var('PUBLISHER_JEVEUXAIDER_NAME') }}'
  order by old_id
  limit 1
),

typed as (
  select
    s.id,
    s.mission_id,
    s.created_by,
    s.created_at,
    s.updated_at,
    case
      when s.type = 'create' then 'Created'
      when s.type = 'delete' then 'Deleted'
      when s.changes ? 'startAt' then 'UpdatedStartDate'
      when s.changes ? 'endAt' then 'UpdatedEndDate'
      when
        s.changes ? 'description' or s.changes ? 'descriptionHtml'
        then 'UpdatedDescription'
      when s.changes ? 'domain' then 'UpdatedActivityDomain'
      when s.changes ? 'places' then 'UpdatedPlaces'
      when
        pj.jva_old_id is not null
        and s.changes ? concat('moderation_', pj.jva_old_id, '_status')
        then 'UpdatedJVAModerationStatus'
      when s.changes ? 'statusCode' then 'UpdatedApiEngModerationStatus'
      when
        s.changes is not null and s.changes <> '{}'::jsonb
        then 'UpdatedOther'
      else 'UpdatedOther'
    end as type
  from source as s
  left join publisher_jva as pj on true
)

select * from typed
