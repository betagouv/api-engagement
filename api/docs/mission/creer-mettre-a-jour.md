---
description: Crée une nouvelle mission ou met à jour une mission existante via son identifiant client.
---

# Créer / mettre à jour une mission

{% swagger src="../openapi.yaml" path="/v2/mission" method="post" expanded="true" %}
{% endswagger %}

{% swagger src="../openapi.yaml" path="/v2/mission/{clientId}" method="put" expanded="true" %}
{% endswagger %}

## Modération et statut `REFUSED`

Une mission qui passe la validation du format est **toujours enregistrée** (HTTP `201` au POST, `200` au PUT, `ok: true`). Le résultat de la modération automatique est dans `data.statusCode` (`ACCEPTED` ou `REFUSED`) et `data.statusComment` (motif). Vérifiez toujours ce champ.

- Une mission `REFUSED` est enregistrée mais **non diffusée**. Son `clientId` reste réservé : un nouveau POST renvoie `409 RESSOURCE_ALREADY_EXIST`.
- Pour la corriger, utilisez `PUT /v2/mission/{clientId}`. La modération est rejouée à chaque PUT sur la mission complète (données existantes + modifications) ; la mission repasse en `ACCEPTED` dès qu'aucune règle n'est violée.
- Les règles sont identiques au POST et au PUT. Elles sont évaluées dans l'ordre ci-dessous, le premier échec donne le motif :

| Règle | Motif (`statusComment`) |
|---|---|
| Titre absent | `Titre manquant` |
| Titre mal encodé | `Problème d'encodage dans le titre` |
| Titre d'un seul mot | `Le titre est trop court (1 seul mot)` |
| `clientId` absent | `ClientId manquant` |
| Description absente | `Description manquante` |
| Description mal encodée | `Problème d'encodage dans la description` |
| Description > 20 000 caractères (tronquée) | `La description est trop longue (plus de 20000 caractères)` |
| `applicationUrl` absente | `URL de candidature manquant` |
| `addresses[].country` hors liste | `Pays non valide : "…"` |
| `remote` hors valeurs autorisées | `Valeur remote non valide (no, possible, full ou local)` |
| `places` ≤ 0 | `Nombre de places invalide (doit être supérieur à 0)` |
| `domain` hors liste | `Domaine non valide : "…"` |
| Nom d'organisation mal encodé | `Problème d'encodage dans le nom de l'organisation` |
| Montants de compensation négatifs, ou max < min | `Montant … invalide` |
| Unité ou type de compensation invalide | `Unité / Type de compensation invalide (…)` |

## Valeurs de référence

Aucune correspondance automatique n'est appliquée : les valeurs doivent être envoyées telles quelles.

- **`addresses[].country`** : code ISO 3166-1 alpha-2 en majuscules (`FR`, `BE`, `CH`…). `FRANCE` est refusé.
- **`domain`** : `animaux`, `autre`, `batiment-industrie-logistique`, `benevolat-competences`, `communication`, `culture-loisirs`, `education`, `emploi`, `environnement`, `gestion-finance-droit`, `humanitaire`, `memoire-et-citoyennete`, `numerique`, `prevention-protection`, `recherche`, `sante`, `service-public-defense-securite`, `sport`, `solidarite-insertion`, `vivre-ensemble`.
- **`remote`** : `no`, `possible`, `full`, `local`.
- **`type`** : `benevolat`, `volontariat_service_civique`, `volontariat_sapeurs_pompiers`, `volontariat_reserve_operationnelle`.
- **`compensationUnit`** : `hour`, `day`, `month`, `year`. **`compensationType`** : `gross`, `net`.
- **`places`** : entier ≥ 1.
