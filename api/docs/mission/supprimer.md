---
description: Supprime une mission à partir de son identifiant client.
---

# Supprimer une mission

{% swagger src="../openapi.yaml" path="/v2/mission/{clientId}" method="delete" expanded="true" %}
{% endswagger %}

## Suppression logique

La suppression est **logique** (soft delete) : la mission reste en base avec `deletedAt` renseigné et n'est plus diffusée. Conséquences :

- le `clientId` ne peut pas être réutilisé : un POST avec le même `clientId` renvoie `409 RESSOURCE_ALREADY_EXIST` ;
- un PUT sur une mission supprimée renvoie `404 NOT_FOUND` ;
- un second DELETE est sans effet et renvoie la même réponse.

Pour republier une mission supprimée, créez-la avec un nouveau `clientId`.
