-- Pas de doublon (kpi_date, campaign_key) ; campaign_key null (hors campagne)
-- neutralisé par coalesce, sinon le group by ne détecterait pas les doublons.
select
  kpi_date,
  coalesce(campaign_key, '') as campaign_key
from {{ ref('tracking_campaign_funnel_daily') }}
group by kpi_date, coalesce(campaign_key, '')
having count(*) > 1
