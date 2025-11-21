select * from {{ ref('stg_publisher') }}
where is_annonceur is false
