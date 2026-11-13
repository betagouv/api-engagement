# Contrat de consentement GTM

Conteneur partagé : `GTM-5XZ4FK3G`. GTM est un transport technique, pas un choix de consentement.
Les quatre choix indépendants sont Google Campaign Manager (`google`), Adform (`adform`),
TikTok (`tiktok`) et Snapchat (`snapchat`).

## Signal envoyé par le site

```js
window.dataLayer.push({
  event: "consent.updated",
  consent_google: "granted",
  consent_adform: "denied",
  consent_tiktok: "granted",
  consent_snapchat: "denied",
});
```

- Un seul évènement contient les quatre états, exclusivement `granted` ou `denied`.
- Il est émis au chargement du document, après lecture des choix enregistrés, puis à chaque
  changement de l'état publicitaire. Un état identique n'est pas émis une deuxième fois.
- Sans aucun choix publicitaire connu, le site n'émet pas de signal et ne charge pas GTM.
- Les accords manquants, expirés par changement de version ou encore `pending` valent `denied`
  dans le signal dès qu'au moins un choix publicitaire est connu.
- Un refus de toutes les régies crée le dataLayer pour y publier l'état, mais ne charge pas GTM.
- Le premier accord charge GTM, après mise en file du signal, sans rejouer les évènements métier
  antérieurs à l'accord.
- Les navigations internes React Router ne réémettent pas ce signal : l'état reste disponible.
- Un retrait d'accord après activation de GTM est enregistré et publié avant le rechargement
  du document, même si une autre régie reste acceptée. Les évènements métier sont bloqués en
  attendant le rechargement.
- L'ancien choix `gtm` n'autorise aucune régie. Les accords PostHog/Crisp sont conservés.

## Configuration obligatoire dans le conteneur

Cette configuration est à réaliser dans GTM ; le code du site ne peut pas garantir le comportement
des balises publiées dans ce service externe.

1. Créer quatre variables de couche de données, nommées exactement `consent_google`,
   `consent_adform`, `consent_tiktok`, `consent_snapchat`. Une valeur absente ne vaut jamais accord.
2. Utiliser `consent.updated` pour prendre en compte l'état initial et les modifications.
   Aucune balise publicitaire ne doit partir avant ce signal.
3. Pour **chaque déclencheur de chaque balise publicitaire**, y compris les conversions ultérieures,
   exiger `consent_<régie> === "granted"` et un nom d'hôte figurant dans une liste explicite des
   domaines de production autorisés. Ne pas utiliser une simple exclusion de « staging ».
4. Appliquer ces gardes aussi aux balises d'initialisation, pixels de base, balises HTML personnalisées
   et dépendances/séquences de balises. Aucun déclencheur « All Pages » non protégé.
5. Le conteneur peut être chargé en staging après un accord, mais **aucune balise publicitaire**
   ne doit y être exécutée.
6. Éviter de compter une conversion à chaque `consent.updated` ou de réinitialiser un pixel déjà
   initialisé. Les conversions doivent correspondre aux évènements métier prévus.

Ces variables personnalisées ne configurent pas automatiquement Google Consent Mode.
Si les balises Google l'utilisent, configurer les états par défaut et leurs mises à jour avec les API
de consentement GTM, tout en conservant le blocage strict des envois avant accord : aucun ping
publicitaire sans consentement.

## Recette après publication

- Sans choix : aucun chargement GTM, aucune requête vers les quatre régies.
- Tout refuser : un signal complet de refus, aucun chargement GTM.
- Accepter chaque régie isolément : seul son trafic publicitaire est autorisé.
- Ajouter un accord : un signal complet, pas de second chargement du conteneur.
- Retirer un accord : cookie et signal mis à jour, puis rechargement ; la régie refusée ne repart pas.
- Naviguer dans le site : pas de nouveau `consent.updated`, les conversions restent filtrées par régie.
- En staging, même en acceptant tout : le conteneur peut charger, aucune requête publicitaire.

La politique de confidentialité est mise à jour dans une tâche distincte.
