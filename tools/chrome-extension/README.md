# API Engagement Tag Assistant — Extension Chrome

Extension Chrome (Manifest V3) pour valider l'installation de `jstag.js` et visualiser les événements de tracking sur les sites partenaires annonceurs.

## Fonctionnalités

### F1 — Détection du script sur la page courante

- **Badge vert ✓** : `jstag.js` détecté (`window._apieng` présent)
- **Badge rouge ✕** : script absent
- Dans le popup : Publisher ID configuré, source du script (officiel vs auto-hébergé), version

### F2 — Timeline des événements sortants

- Capture toutes les requêtes vers `api.api-engagement.beta.gouv.fr/r/*`
- Types : `trackApplication` (`/r/apply`), `trackAccount` (`/r/account`), `Impression` (`/r/impression/…`), `Confirm human`
- Affiche : type, statut HTTP, horodatage, paramètres décodés (publisher, mission, view, clientEventId…)
- Cliquer sur un événement pour dérouler tous ses paramètres
- **Toast** : notification overlay discrète sur la page à chaque événement capté

## Installation

### Pour les partenaires

L'extension n'est pas publiée sur le Chrome Web Store. Elle est distribuée depuis le même domaine
que `jstag.js` :

1. Télécharger [`chrome-extension.zip`](https://app.api-engagement.beta.gouv.fr/chrome-extension.zip)
2. Dézipper l'archive
3. Ouvrir `chrome://extensions`, activer le **Mode développeur** (toggle en haut à droite)
4. Cliquer **Charger l'extension non empaquetée** et sélectionner le dossier dézippé

L'icône apparaît dans la barre d'outils Chrome. L'épingler pour un accès rapide.

> L'archive est générée dans `app/public/chrome-extension.zip` pendant le build Docker de
> l'application, puis servie par l'application.

### Pour les contributeurs (depuis les sources)

Mêmes étapes, mais sélectionner directement le dossier `tools/chrome-extension/` du dépôt (pas
besoin de télécharger le zip).

## Prérequis pour tester

Le tracking ne s'active que si la page a été ouverte via une **URL trackée** contenant
`?apiengagement_id=…` : c'est elle qui fait poser le cookie `apiengagement`, sans lequel
`trackApplication` / `trackAccount` n'envoient rien. Demander une URL trackée à l'équipe API
Engagement avant de tester. Voir la [documentation tracking annonceur](https://doc.api-engagement.beta.gouv.fr/annoncer-des-missions/tracking-des-candidatures/rajout-de-la-balise-et-des-commandes-de-tracking-par-le-tag).

## Utilisation

1. Naviguer sur le site d'un partenaire annonceur
2. Cliquer sur l'icône de l'extension pour ouvrir le popup
3. **Section "Jstag"** : vérifier que le script est détecté et que le Publisher ID est configuré
4. **Section "Événements"** : naviguer le parcours de candidature et observer les événements apparaître en temps réel (toast sur la page + liste dans le popup)

## Cas de test (recette)

### Cas 1 — Page sans tag

Ouvrir le popup sur n'importe quelle page n'ayant pas intégré `jstag.js` (ex. google.fr).

**Attendu :** badge rouge, message "Jstag non détecté".

### Cas 2 — Page avec tag officiel

Ouvrir le popup sur une page partenaire ayant :

```html
<script src="https://app.api-engagement.beta.gouv.fr/public/jstag.js"></script>
<script>apieng("config", "mon-publisher-id")</script>
```

**Attendu :** badge vert, source "Officiel", Publisher ID affiché.

### Cas 3 — Parcours de candidature

Arriver sur une page partenaire via un lien tracké (avec `?apiengagement_id=xxx`), puis déclencher `trackApplication`.

**Attendu :**
- Toast "trackApplication" s'affiche sur la page avec le statut HTTP
- L'événement apparaît dans la timeline du popup avec `view`, `mission`, `publisher` correctement renseignés
- Croiser avec la page "Événements temps réel" du back-office pour confirmer la cohérence

## Architecture

```
tools/chrome-extension/
├── manifest.json              # Manifest V3
├── background/
│   └── service-worker.js      # Capture webRequest /r/*, gère l'état par onglet, émet les toasts
├── content/
│   ├── detect.js              # Injecté en MAIN world : lit window._apieng
│   └── toast.js               # Content script permanent : affiche les toasts overlay
├── popup/
│   ├── popup.html / .js / .css
└── icons/
```

## Notes

- Les données d'événements sont stockées en `chrome.storage.session` (effacées à la fermeture du navigateur)
- La liste des événements se réinitialise à chaque rechargement de page
- Le bouton ✕ dans le popup efface la liste manuellement
- Certains partenaires auto-hébergent `jstag.js` : l'extension fonctionne dans les deux cas
