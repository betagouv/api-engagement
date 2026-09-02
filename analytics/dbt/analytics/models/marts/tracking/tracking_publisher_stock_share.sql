-- Part de marché par annonceur sur la Plateforme de l'Engagement : croise le
-- stock de missions diffusables PDE (`mission_diffusion`, diffuseur = PDE) avec
-- les recommandations et les clics du quiz, pour repérer les annonceurs sur- ou
-- sous-représentés par rapport à leur offre. Grain : une ligne par annonceur
-- (`publisher_id`) présent dans le stock diffusable PDE.
with stock as (
  select
    m.publisher_id,
    count(distinct md.mission_id) as stock_mission_count
  from {{ ref('int_mission_diffusion') }} as md
  inner join {{ ref('stg_mission') }} as m on md.mission_id = m.id
  where
    md.distribution_publisher_id
    = '{{ var("PUBLISHER_PLATEFORME_ENGAGEMENT_ID") }}'
    and md.deleted_at is null
    and m.publisher_id is not null
  group by m.publisher_id
),

reco as (
  select
    publisher_id,
    count(*) as reco_count
  from {{ ref('int_tracking_recommendation') }}
  group by publisher_id
),

clicks as (
  select
    publisher_id,
    count(*) as click_count
  from {{ ref('int_tracking_mission_click') }}
  group by publisher_id
),

base as (
  select
    s.publisher_id,
    s.stock_mission_count,
    p.name as publisher_name,
    coalesce(r.reco_count, 0) as reco_count,
    coalesce(c.click_count, 0) as click_count
  from stock as s
  left join {{ ref('stg_publisher') }} as p on s.publisher_id = p.id
  left join reco as r on s.publisher_id = r.publisher_id
  left join clicks as c on s.publisher_id = c.publisher_id
),

with_shares as (
  select
    publisher_id,
    publisher_name,
    stock_mission_count,
    reco_count,
    click_count,
    stock_mission_count::numeric
    / nullif(sum(stock_mission_count) over (), 0) as stock_share,
    reco_count::numeric
    / nullif(sum(reco_count) over (), 0) as reco_share,
    click_count::numeric
    / nullif(sum(click_count) over (), 0) as click_share
  from base
)

select
  publisher_id,
  publisher_name,
  stock_mission_count,
  reco_count,
  click_count,
  stock_share,
  reco_share / nullif(stock_share, 0) as reco_vs_stock_index,
  click_share / nullif(stock_share, 0) as click_vs_stock_index
from with_shares
order by stock_mission_count desc
