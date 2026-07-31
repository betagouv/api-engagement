# Emails, newsletter et consentement

## Envoi de missions

La plateforme relaie l'envoi via `/api/email/mission`, puis vers l'API backend. La requête peut cibler un scoring utilisateur ou une liste explicite de missions selon le contrat partagé.

Pour un scoring, le service recherche le dernier résultat correspondant à la version courante du moteur. En son absence, il peut recalculer les résultats. Les missions sont ensuite chargées et remises dans l'ordre du matching. Pour une liste explicite, les missions sont conservées dans l'ordre demandé lorsqu'elles sont disponibles.

Le résultat du service peut être `sent`, `skipped`, `failed`, `forbidden` ou `not_found`. Le contrôleur traduit notamment l'échec d'envoi en réponse HTTP 502 et renvoie l'identifiant du scoring lorsque celui-ci est connu.

## Newsletter

L'inscription est relayée par `/api/newsletter`. Le backend n'autorise que les publishers associés à une liste configurée. Un publisher non autorisé reçoit une réponse `forbidden`. Le service d'email peut également inscrire l'adresse à la newsletter selon les paramètres de la requête.

## Consentement

Le gestionnaire distingue les cookies nécessaires au fonctionnement du service des services de mesure soumis au choix de l'utilisateur. Le consentement est persisté côté navigateur et les providers concernés sont activés ou désactivés en conséquence. L'utilisateur peut rouvrir le gestionnaire pour modifier ses choix.

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
