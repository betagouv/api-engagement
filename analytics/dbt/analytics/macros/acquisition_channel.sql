{% macro acquisition_channel(
  referring_domain_column, is_from_campaign_column
) %}
{#-
  Canal d'acquisition d'une session, sur le modèle du rapport « Type de canal »
  de Matomo. Codes en minuscules, libellés posés dans Metabase.
  L'ORDRE DES BRANCHES COMPTE :
  - `email` et `ai_assistant` passent AVANT `search` : `mail.google.com`,
    `com.google.android.gm` (Gmail) et `gemini.google.com` sont des domaines
    Google qui ne sont pas des moteurs de recherche.
  - Les applis Android transmettent un nom de package (`com.google.android.gm`,
    `com.slack`), pas un domaine.
  Comparaison en `lower()`, regex ancrées en fin de chaîne pour éviter les
  faux positifs. Listes volontairement dans la macro et non dans un seed : un
  changement de seed impose un `seed --full-refresh` manuel en prod.
-#}
  {%- set domain = 'lower(' ~ referring_domain_column ~ ')' -%}
case
  -- 1. Session attribuée à une campagne (lien tracké ou UTM).
  when {{ is_from_campaign_column }} then 'campaign'
  -- 2. Sans referrer (QR code, favori, applis et messageries qui n'en
  --    transmettent pas) ou navigation depuis nos propres domaines.
  when
    {{ referring_domain_column }} is null
    or {{ domain }} in ('', '$direct')
    {% for pattern in var('TROUVE_TA_MISSION_HOST_PATTERNS') %}
      or {{ domain }} like '{{ pattern }}'
    {% endfor %}
    then 'direct'
  -- 3. Webmails et applis mail.
  when
    {{ domain }} in (
      'mail.google.com',
      'com.google.android.gm',
      'outlook.live.com',
      'outlook.office.com',
      'outlook.office365.com'
    )
    or {{ domain }} ~ '^(webmail|messagerie|mail)\.'
    then 'email'
  -- 4. Assistants IA conversationnels.
  when
    {{ domain }} in (
      'chatgpt.com',
      'chat.openai.com',
      'perplexity.ai',
      'www.perplexity.ai',
      'claude.ai',
      'gemini.google.com',
      'copilot.microsoft.com',
      'chat.mistral.ai'
    )
    then 'ai_assistant'
  -- 5. Moteurs de recherche : Google (`google.<tld>`, `www.google.<tld>`,
  --    appli Android), puis les autres moteurs et leurs sous-domaines.
  when
    {{ domain }} ~ '^(www\.)?google\.[a-z]{2,3}(\.[a-z]{2})?$'
    or {{ domain }} in (
      'com.google.android.googlequicksearchbox',
      'search.brave.com',
      'search.yahoo.com'
    )
    or {{ domain }}
    ~ '(^|\.)(bing|qwant|duckduckgo|ecosia|yahoo|lilo)\.[a-z]{2,3}$'
    then 'search'
  -- 6. Réseaux sociaux et messageries sociales (`l.` / `m.` / `lm.` inclus
  --    par le préfixe `(^|\.)`).
  when
    {{ domain }} ~ (
      '(^|\.)(facebook\.com|instagram\.com|linkedin\.com|lnkd\.in|t\.co'
      || '|x\.com|twitter\.com|tiktok\.com|youtube\.com|youtu\.be'
      || '|snapchat\.com|whatsapp\.com)$'
    )
    then 'social'
  -- 7. Tout le reste : sites partenaires, intranets, Slack, Teams, visio...
  else 'website'
end
{%- endmacro %}
