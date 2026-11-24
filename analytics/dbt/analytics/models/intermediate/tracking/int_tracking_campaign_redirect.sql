-- Une ligne par redirection TTM vers l'annonceur, attribuée au dernier clic
-- de campagne transmis par TTM. Aucun rattachement à une session PostHog.
select
  r.stat_event_id as redirect_id,
  r.created_at as redirected_at,
  pde.origin_click_id,
  pde.user_scoring_id,
  origin.campaign_id
from {{ ref('click_pde_attrs') }} as pde
inner join {{ ref('click') }} as r on pde.click_id = r.stat_event_id
inner join {{ ref('click') }} as origin
  on pde.origin_click_id = origin.stat_event_id
inner join {{ ref('stg_campaign') }} as c on origin.campaign_id = c.id
where
  -- Le staging normalise la source `publisher` en `api`.
  r.source = 'api'
  and r.from_publisher_id = '{{ var("PUBLISHER_TROUVE_TA_MISSION_ID") }}'
  and origin.source = 'campaign'
  and not r.is_bot
  and not origin.is_bot
