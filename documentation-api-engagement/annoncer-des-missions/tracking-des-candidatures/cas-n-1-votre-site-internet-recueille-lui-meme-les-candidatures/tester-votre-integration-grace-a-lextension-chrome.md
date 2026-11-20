---
description: >-
  L'extension Chrome « API Engagement Tag Assistant » rend chaque étape visible
  (script détecté, cookie posé, événements envoyés).
---

# Tester votre intégration grâce à l'extension Chrome

**Installer l'extension** (elle n'est pas publiée sur le Chrome Web Store) :

1. Télécharger `chrome-extension.zip` mis à disposition par l'équipe de l'API Engagement : [https://app.api-engagement.beta.gouv.fr/chrome-extension.zip](https://app.api-engagement.beta.gouv.fr/chrome-extension.zip)
2. Dézipper l'archive.
3. Ouvrir `chrome://extensions`, activer le **Mode développeur** (en haut à droite).
4. Cliquer **Charger l'extension non empaquetée** et sélectionner le dossier dézippé.



**Recette de test :**

1. Obtenez une **URL trackée** auprès de l'équipe API Engagement (ou utilisez un lien de diffusion existant). Cela peut être fait en demandant directement à votre chargé·e de déploiement avec qui vous êtes en contact, ou directement via l’adresse contact [api-engagement@beta.gouv.fr](mailto:api-engagement@beta.gouv.fr). Cette URL doit contenir `?apiengagement_id=…`.
2. Ouvrez votre page via cette URL. Dans l'extension, vérifiez que le JSTag est détecté, que votre ID partenaire est affiché, et que le cookie `apiengagement` est posé.
3. Déclenchez l'événement : un `trackApplication` (`/r/apply`) doit apparaître dans l'extension avec un statut 200 et les paramètres `view`, `mission`, `publisher`.
4. Recoupez avec la page « Événements temps réel » de votre espace partenaire : [https://app.api-engagement.beta.gouv.fr/settings/real-time](https://app.api-engagement.beta.gouv.fr/settings/real-time)

<figure><img src="../../../.gitbook/assets/image (33).png" alt=""><figcaption></figcaption></figure>
