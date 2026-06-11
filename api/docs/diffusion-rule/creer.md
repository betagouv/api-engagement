---
description: Crée une règle de diffusion appliquée à un ou plusieurs de vos diffuseurs.
---

# Créer une règle de diffusion

Crée une règle de diffusion pour un ou plusieurs de vos partenaires diffuseurs. Une fois la règle créée, seules vos missions qui la satisfont (ainsi que toutes les autres règles déjà configurées pour ce diffuseur) lui sont diffusées. Le fonctionnement général et la liste complète des champs et opérateurs sont décrits dans [Comprendre les règles de diffusion](diffusion.md).

## Corps de la requête

| Champ | Obligatoire | Description |
| --- | --- | --- |
| `publisherIds` | oui | Identifiants des diffuseurs auxquels appliquer la règle. Seuls les diffuseurs effectivement associés à votre compte sont pris en compte ; si aucun identifiant ne correspond, l'API renvoie une erreur `403`. |
| `field` | oui | Champ de la mission évalué par la règle : `type`, `publisherOrganizationId`, `publisherOrganization.clientId` ou `publisherOrganization.parentOrganizations`. |
| `operator` | oui | Opérateur de comparaison : `is`, `is_not`, `contains`, `does_not_contain`, `starts_with`, `is_greater_than`, `is_less_than`, `exists`, `does_not_exist`. |
| `value` | oui | Valeur comparée au champ de la mission (ignorée pour `exists` et `does_not_exist`, mais à fournir tout de même). |
| `fieldType` | non | Type de la valeur évaluée (`string` par défaut). |

Une règle est créée par diffuseur : la réponse contient autant d'entrées que de diffuseurs concernés, chacune avec son propre `id` (à utiliser pour la [suppression](supprimer.md)).

L'opération est idempotente : si une règle identique (même `field`, `value`, `operator` et `fieldType`) existe déjà pour un diffuseur, la règle existante est retournée plutôt que dupliquée. En revanche, si une règle existe déjà pour le même `field` et la même `value` mais avec un opérateur différent, l'API renvoie une erreur `409`.

Exemple — exclure les missions du réseau « Marine nationale » chez deux diffuseurs :

```json
{
  "publisherIds": ["5f5931496c7ea514150a818f", "60a1b2c3d4e5f6789abc0001"],
  "field": "publisherOrganization.parentOrganizations",
  "operator": "does_not_contain",
  "value": "Marine nationale"
}
```

{% swagger src="../openapi.yaml" path="/v0/diffusion-rule" method="post" expanded="true" %}
{% endswagger %}
