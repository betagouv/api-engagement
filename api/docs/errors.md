---
description: Format des erreurs et liste des codes retournés par l'API
---

# Erreurs

## Format standard

Toutes les erreurs retournent un objet JSON avec la structure suivante :

```json
{
  "ok": false,
  "code": "ERROR_CODE",
  "message": "Description lisible de l'erreur"
}
```

## Codes d'erreur

| Code | HTTP | Description |
|---|---|---|
| `INVALID_BODY` | 400 | Corps de requête invalide — champ manquant, mauvais type ou valeur hors contrainte |
| `INVALID_PARAMS` | 400 | Paramètre de chemin invalide (ex. : identifiant mal formé) |
| `INVALID_QUERY` | 400 | Paramètre de query invalide |
| `NOT_FOUND` | 404 | Ressource introuvable |
| `RESSOURCE_ALREADY_EXIST` | 409 | Conflit — une mission avec ce `clientId` existe déjà |
| `NO_PARTNER` | 400 | Aucun partenaire diffuseur configuré pour cette clé API |
| `UNAUTHORIZED` | 401 | Clé API absente ou invalide |
| `TOO_MANY_REQUESTS` | 429 | Limite de débit atteinte |

## Limite de débit (rate limiting)

L'API autorise **600 requêtes par fenêtre de 60 secondes**, identifiées par votre clé API.

En cas de dépassement, l'API retourne un `429 Too Many Requests`. Les headers de réponse indiquent l'état de votre quota :

| Header | Description |
|---|---|
| `X-RateLimit-Limit` | Nombre maximum de requêtes autorisées sur la fenêtre |
| `X-RateLimit-Remaining` | Requêtes restantes sur la fenêtre en cours |
| `X-RateLimit-Reset` | Timestamp Unix de réinitialisation du compteur |

## Erreurs de validation

Pour les erreurs `INVALID_BODY`, le champ `message` précise le ou les champs en cause :

```json
{
  "ok": false,
  "code": "INVALID_BODY",
  "message": "\"title\" is required"
}
```
