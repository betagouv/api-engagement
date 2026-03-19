---
description: Suivi des activités générées par vos missions (impressions, clics, candidatures)
---

# Activités

Endpoints de suivi de l'engagement sur vos missions. Permettent de **déclarer et consulter les activités** (impression, clic, candidature) que vos utilisateurs génèrent sur les missions que vous diffusez.

{% swagger src="./openapi.yaml" path="/v2/activity" method="post" %}
{% endswagger %}

{% swagger src="./openapi.yaml" path="/v2/activity/{id}" method="get" %}
{% endswagger %}

{% swagger src="./openapi.yaml" path="/v2/activity/{id}" method="put" %}
{% endswagger %}
