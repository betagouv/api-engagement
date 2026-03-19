---
description: Gestion et consultation de vos propres missions (annonceurs)
---

# Mes missions

Endpoints de gestion des missions pour les **partenaires annonceurs**. Comprend la création, la mise à jour et la suppression de missions (v2), ainsi que leur consultation côté annonceur (v0).

## Gestion (v2)

{% swagger src="./openapi.yaml" path="/v2/mission" method="post" %}
{% endswagger %}

{% swagger src="./openapi.yaml" path="/v2/mission/{clientId}" method="put" %}
{% endswagger %}

{% swagger src="./openapi.yaml" path="/v2/mission/{clientId}" method="delete" %}
{% endswagger %}

## Consultation (v0)

{% swagger src="./openapi.yaml" path="/v0/mymission" method="get" %}
{% endswagger %}

{% swagger src="./openapi.yaml" path="/v0/mymission/{clientId}" method="get" %}
{% endswagger %}

{% swagger src="./openapi.yaml" path="/v0/mymission/{clientId}/stats" method="get" %}
{% endswagger %}
