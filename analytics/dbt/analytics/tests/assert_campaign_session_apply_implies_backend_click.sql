-- Une candidature n'est rattachée à une session que via un clic backend :
-- has_apply implique has_backend_click et apply_count > 0.
select tracking_session_id
from {{ ref('tracking_campaign_session') }}
where
  has_apply
  and (not has_backend_click or apply_count = 0)
