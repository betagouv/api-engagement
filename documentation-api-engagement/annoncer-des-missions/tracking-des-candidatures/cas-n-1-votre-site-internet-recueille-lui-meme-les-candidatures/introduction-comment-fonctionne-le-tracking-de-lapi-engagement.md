# Introduction : comment fonctionne le tracking de l'API Engagement ?

Le tracking repose sur une chaîne en trois étapes :

1. **URL trackée** : l'utilisateur arrive sur votre site via un lien fourni par l’API Engagement au site diffuseur, qui contient un paramètre `?apiengagement_id=…`.
2. **Cookie déposé** : le JSTag lit ce paramètre et dépose un cookie `apiengagement` (valable 30 jours) sur l'appareil de l'utilisateur.
3. **Événement déclenché** : quand votre code appelle `trackApplication` / `trackAccount`, l'appel vers API Engagement ne part **que si le cookie est présent**.

Sans cookie, `trackApplication()` et `trackAccount()` ne font rien : aucune erreur, aucune requête réseau. C'est le problème le plus courant lors des tests de l'intégration ; Si vous ouvrez directement votre page sans passer par une URL trackée, aucun cookie n'est posé, donc rien n'est envoyé. Cela ne signifie pas que votre code est incorrect.

### Le cookie `apiengagement`

| Attribut        | Valeur                                                             |
| --------------- | ------------------------------------------------------------------ |
| Nom             | `apiengagement`                                                    |
| Valeur          | l'identifiant de clic (`apiengagement_id`) reçu dans l'URL trackée |
| Durée de vie    | 30 jours                                                           |
| Domaine         | votre domaine (`www.exemple.fr` → `.exemple.fr`)                   |
| Path / SameSite | `/` · `Lax` · `Secure`                                             |
| Posé par        | le JSTag, dès qu'il détecte `?apiengagement_id=…` dans l'URL       |

Le cookie fait le lien entre le clic d'origine et la candidature. Tant qu'il est présent (jusqu'à 30 jours après le clic), `trackApplication` / `trackAccount` enverront l'événement.
