---
description: Consultation et gestion des organisations présentes sur la plateforme
---

# Organisations

Endpoints de consultation des organisations qui publient des missions sur la plateforme, et de gestion de votre propre organisation.

## Consultation (v0)

{% swagger src="./openapi.yaml" path="/v0/organization" method="get" %}
{% endswagger %}

## Mon organisation (v0)

{% swagger src="./openapi.yaml" path="/v0/myorganization/{organizationClientId}" method="get" %}
{% endswagger %}

{% swagger src="./openapi.yaml" path="/v0/myorganization/{organizationClientId}" method="put" %}
{% endswagger %}
