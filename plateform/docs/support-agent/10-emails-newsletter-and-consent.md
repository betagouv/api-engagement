# Emails, newsletter et consentement

## Envoi de missions

La plateforme utilise l'endpoint `/api/email/mission` pour relayer l'envoi d'emails de missions vers l'API backend. La requête peut être basée sur un scoring utilisateur ou une liste explicite de missions, selon le contrat partagé.

- **Scoring utilisateur** : Le service recherche le dernier résultat de scoring correspondant à la version courante du moteur. Si aucun résultat n'est trouvé, il peut recalculer les résultats. Les missions sont ensuite chargées et triées selon l'ordre du matching.
- **Liste explicite de missions** : Les missions sont conservées dans l'ordre spécifié si elles sont disponibles.

Le résultat du service peut être l'un des suivants : `sent`, `skipped`, `failed`, `forbidden` ou `not_found`. En cas d'échec d'envoi, le contrôleur renvoie une réponse HTTP 502 et inclut l'identifiant du scoring si connu.

### Conditions et validations

- Le corps de la requête doit contenir soit `userScoringId`, soit `missionIds`.
- Si `userScoringId` est fourni, `distinctId` doit également être présent.
- `missionIds` doit contenir entre 1 et 5 identifiants de mission.

### Réponses possibles

- **200 OK** : Email envoyé avec succès ou ignoré avec une raison.
- **400 Bad Request** : Corps de la requête invalide.
- **403 Forbidden** : `distinctId` invalide.
- **404 Not Found** : Scoring utilisateur introuvable.
- **502 Bad Gateway** : Échec de l'envoi de l'email.

## Newsletter

L'inscription à la newsletter est gérée via l'endpoint `/api/newsletter`. Seuls les publishers associés à une liste configurée sont autorisés à inscrire des adresses email.

- Un publisher non autorisé reçoit une réponse `forbidden`.
- Le service d'email peut inscrire l'adresse à la newsletter selon les paramètres de la requête.

### Conditions et validations

- Le corps de la requête doit contenir un email valide.
- `distinctId` est optionnel.

### Réponses possibles

- **200 OK** : Inscription réussie.
- **400 Bad Request** : Corps de la requête invalide.
- **403 Forbidden** : Publisher non autorisé.
- **502 Bad Gateway** : Échec de l'inscription à la newsletter.

## Consentement

Le gestionnaire de consentement distingue les cookies nécessaires au fonctionnement du service des services de mesure soumis au choix de l'utilisateur. Le consentement est stocké côté navigateur, et les services concernés sont activés ou désactivés en conséquence. L'utilisateur peut rouvrir le gestionnaire pour modifier ses choix.

### Fonctionnalités

- **Lecture et écriture des préférences** : Les préférences de consentement sont lues à partir des cookies et peuvent être mises à jour.
- **Activation des services** : Les services sont activés ou désactivés selon les préférences de consentement.
- **Gestionnaire de consentement** : L'utilisateur peut ouvrir le panneau de consentement pour modifier ses choix.

## Sources

- `plateform/app/routes/api.email.mission.ts`
- `plateform/app/routes/api.newsletter.ts`
- `plateform/app/services/email.ts`
- `plateform/app/services/newsletter.ts`
- `plateform/app/services/cookie-consent.ts`
- `api/src/controllers/email.ts`
- `api/src/controllers/newsletter.ts`
- `api/src/services/mission-email/index.ts`
- `api/src/services/newsletter/index.ts`
