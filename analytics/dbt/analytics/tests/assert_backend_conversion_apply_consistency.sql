-- Une session has_apply doit avoir apply_count > 0 et un first_apply_at.
select quiz_session_id
from {{ ref('int_tracking_backend_conversion') }}
where
  has_apply
  and (apply_count = 0 or first_apply_at is null)
