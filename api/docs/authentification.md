---
description: Comment utiliser votre clé API pour authentifier vos requêtes
---

# Authentification

L'API Engagement utilise des **clés API** pour authentifier les requêtes. Chaque partenaire dispose d'une clé unique associée à son compte.

## Utilisation

Transmettez votre clé API dans le header HTTP `x-api-key` à chaque requête :

```http
GET /v0/mission HTTP/1.1
Host: api.api-engagement.beta.gouv.fr
x-api-key: votre-clé-api
```

Exemple avec cURL :

```bash
curl https://api.api-engagement.beta.gouv.fr/v0/mission \
  -H "x-api-key: votre-clé-api"
```

## Obtenir une clé API

> **La création d'une clé API nécessite l'aide d'un chargé de déploiement** avec qui vous êtes en contact. Cette personne pourra générer cette clé pour vous depuis le tableau de bord.

Une fois obtenue, votre clé est consultable et gérable depuis votre tableau de bord partenaire.

## Sécurité

Votre clé API confère un accès complet à votre compte partenaire. Prenez les précautions suivantes :

- Ne partagez jamais votre clé dans un dépôt Git public
- Ne l'exposez pas dans du code côté client (JavaScript navigateur, application mobile)
- Stockez-la dans une variable d'environnement côté serveur
- En cas de compromission, contactez votre chargé de déploiement pour la renouveler

## Réponse en cas d'erreur

Si la clé est absente ou invalide, l'API retourne :

```http
HTTP/1.1 401 Unauthorized
```

```json
{
  "ok": false,
  "code": "UNAUTHORIZED",
  "message": "Unauthorized"
}
```
