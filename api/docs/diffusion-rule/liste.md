---
description: Récupère, pour chacun de vos diffuseurs, les règles de diffusion configurées.
---

# Lister les règles de diffusion

Retourne la liste de vos partenaires diffuseurs, chacun accompagné des règles de diffusion que vous avez configurées pour lui. Un diffuseur sans règle reçoit toutes vos missions (voir [Comprendre les règles de diffusion](diffusion.md)).

## Paramètres de requête

| Paramètre | Obligatoire | Description |
| --- | --- | --- |
| `field` | non | Champ sur lequel évaluer la diffusion : `type`, `publisherOrganizationId`, `publisherOrganization.clientId` ou `publisherOrganization.parentOrganizations`. À fournir conjointement avec `value`. |
| `value` | non | Valeur recherchée sur le champ `field`. À fournir conjointement avec `field`. |

`field` et `value` vont par paire : fournir l'un sans l'autre renvoie une erreur `400`. Lorsqu'ils sont présents, chaque diffuseur est annoté d'un booléen `diffuse` indiquant s'il diffuserait une mission portant cette valeur sur ce champ — `false` si une de ses règles d'exclusion (`is_not`, `does_not_contain`, `does_not_exist`) sur ce champ exclut la valeur, `true` sinon. Le détail du calcul est décrit dans [Comprendre les règles de diffusion](diffusion.md).

Exemple — savoir quels diffuseurs excluent le réseau « Marine nationale » :

```
GET /v0/diffusion-rule?field=publisherOrganization.parentOrganizations&value=Marine nationale
```

{% swagger src="../openapi.yaml" path="/v0/diffusion-rule" method="get" expanded="true" %}
{% endswagger %}
