---
description: Supprime une règle de diffusion rattachée à votre compte annonceur.
---

# Supprimer une règle de diffusion

Supprime une règle de diffusion que vous avez configurée. Le diffuseur concerné recevra à nouveau les missions que cette règle excluait (sous réserve des autres règles encore en place).

L'identifiant attendu est le `id` de la règle, tel que retourné par la [liste](liste.md) ou la [création](creer.md). Seules les règles rattachées à votre compte annonceur peuvent être supprimées : tenter de supprimer la règle d'un autre annonceur renvoie une erreur `403`.

{% swagger src="../openapi.yaml" path="/v0/diffusion-rule/{id}" method="delete" expanded="true" %}
{% endswagger %}
