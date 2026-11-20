---
description: >-
  Le tag API Engagement est un script à ajouter sur votre site. Il permet de
  compter les candidatures et les créations de compte qui arrivent chez vous
  grâce aux missions diffusées par API Engagement
---

# Installer le tag API Engagement (méthode recommandée)

**Avant de commencer, il vous faut :**

* votre identifiant partenaire (Espace partenaire > Paramètres > Tracking des événements) ;
* un accès au code de votre site, ou une personne qui l’a (webmaster, prestataire).

**L’installation se fait en deux étapes :** ajouter le tag sur toutes les pages (étape 1), puis déclencher une commande quand une candidature est envoyée (étape 2).

## 1. Ajouter le tag sur toutes les pages de votre site

Copiez le code ci-dessous dans la balise `<head>` de **chaque page**, tout en haut, avant les autres scripts et feuilles de style. Remplacez `votre-id-de-partenaire` par votre identifiant.

```html
<script>
(function (i, s, o, g, r, a, m) {
i["ApiEngagementObject"] = r; (i[r] = i[r] || function () { (i[r].q = i[r].q || []).push(arguments); }), (i[r].l = 1 * new Date()); (a = s.createElement(o)), (m = s.getElementsByTagName(o)[0]); a.async = 1; a.src = g; m.parentNode.insertBefore(a, m);
})(window, document, "script", "https://app.api-engagement.beta.gouv.fr/jstag.js", "apieng");
apieng("config", "votre-id-de-partenaire");
</script>
```

**Pourquoi toutes les pages ?** Un candidat peut arriver sur n’importe quelle page de votre site, pas seulement l’accueil. C’est sur la page d’arrivée que le tag enregistre qu’il vient d’un lien tracké par l'API Engagement. Si le tag y manque, sa candidature ne sera pas comptée, même si elle aboutit.

**Le plus simple :** placez-le dans l’en-tête commun à tout le site (le gabarit ou « header »). Une seule installation couvre alors toutes les pages.

**Pourquoi tout en haut ?** Pour que le script s’exécute dès l’arrivée du visiteur, avant qu’il ne navigue ailleurs.

**Ce que fait le tag, en clair**

* Il dépose **un seul cookie**, nommé `apiengagement`, **sur votre propre domaine**, pour **30 jours**.
* Ce cookie n’est déposé **que** pour les visiteurs arrivés via un lien API Engagement. Les autres visiteurs n’en reçoivent aucun.
* Il contient uniquement un identifiant technique de redirection : ni nom, ni email, ni téléphone.
* Il ne sert ni à la publicité, ni au ciblage, et n’est pas lisible par d’autres sites.
* Pensez à le mentionner dans la politique de confidentialité de votre site.

Pour en savoir plus : [Traitement des données utilisateurs](../../../ressources/traitement-des-donnees-utilisateurs.md).

<details>

<summary>À destination des développeurs (explications techniques)</summary>

Ce script effectue **trois actions** principales :&#x20;

* **il crée un élément** `<script>` pour démarrer le téléchargement asynchrone de la bibliothèque JavaScript jstag.js depuis https://app.api-engagement.beta.gouv.fr/jstag.js
* **il initialise une fonction** globale apieng (appelée "file d'attente de commandes apieng()") permettant de planifier l'exécution des commandes une fois la bibliothèque jstag.js chargée et prête à être utilisée
* **il ajoute la commande `apieng()`** à la variable `window` qui permet d'accéder à toutes les fonctionnalités de tracking de l'API Engagement.

</details>

## 2. Quand déclencher le comptage d'un événement sur votre site ?

Déclenchez la commande **uniquement quand l’événement a vraiment eu lieu** :

* **Candidature** : quand la candidature a été **envoyée avec succès**, c’est-à-dire enregistrée par votre site (message de confirmation affiché, ou réponse positive de votre serveur).
* **Création de compte** : quand le compte a été **enregistré dans votre base**. Par exemple, avec un fonctionnement front-back, quand le backend a confirmé la création.

> ⚠️ **À ne pas faire**
>
> * Déclencher au simple clic sur le bouton « Postuler » : si le formulaire échoue, la candidature sera quand même comptée.
> * Déclencher plusieurs fois pour la même candidature : si vous utilisez une page de confirmation, vérifiez qu’un rechargement de la page ne relance pas la commande.

> ℹ️ La page où la commande est déclenchée doit elle aussi contenir le tag (voir étape 1). Si votre formulaire de candidature est sur un autre domaine ou sous-domaine que votre site, contactez-nous avant d’installer.

## **3. Les deux commandes**

Il existe deux commandes pour traquer des événements de candidatures sur votre site (ou de création de compte si cela est pertinent sur votre site), qui s’écrivent de la même façon :

| Événement           | Commande minimale                                    |
| ------------------- | ---------------------------------------------------- |
| Candidature déposée | `window.apieng && window.apieng("trackApplication")` |
| Compte créé         | `window.apieng && window.apieng("trackAccount")`     |

Ces commandes minimales suffisent pour que l’événement soit compté. Il est toutefois conseillé d’y ajouter des informations (voir partie 4).

**Comment se lit une commande**

Une commande contient jusqu’à **trois informations, toujours dans cet ordre** :

```js
window.apieng && window.apieng("trackApplication", clientId, options)
//                              ①                   ②          ③
```

| Position | Quoi                                                                              | Obligatoire ?                                          |
| -------- | --------------------------------------------------------------------------------- | ------------------------------------------------------ |
| ①        | Le type d’événement : `"trackApplication"` ou `"trackAccount"`                    | Oui                                                    |
| ②        | L’identifiant de la mission, celui utilisé dans votre flux XML (champ `clientId`) | Non, mais fortement conseillé lorsqu'il est disponible |
| ③        | Des options : votre identifiant de candidature, des informations sur le candidat  | Non                                                    |

> `window.apieng &&` au début évite une erreur si le tag n’est pas chargé sur la page. Gardez-le toujours.

## **4. Ajouter des informations personnalisées sur les événements**

### **4.1 L’identifiant de mission (position ②)**

Indiquez l’identifiant de la mission concernée, tel qu’il figure dans votre flux XML. Il nous permet de vous fournir des statistiques par mission.

<pre class="language-js"><code class="lang-js"><strong>window.apieng &#x26;&#x26; window.apieng("trackApplication", "MISSION-123")
</strong>window.apieng &#x26;&#x26; window.apieng("trackAccount", "MISSION-123")
</code></pre>

Vous ne le connaissez pas au moment du comptage ? Ce n’est pas bloquant : utilisez la commande minimale. **Mais si vous voulez ajouter des options, lisez la règle ci-dessous.**

### **4.2 ⚠️ Pas d’identifiant de mission mais des options ? Écrivez `undefined`**

Les informations sont lues **par leur position**, pas par leur nom. Pour envoyer des options (position ③) sans identifiant de mission, vous devez **réserver la position ② en y écrivant `undefined`**. Cette règle vaut pour les deux commandes.

```js
// ✅ Correct
window.apieng && window.apieng("trackApplication", undefined, {
  customAttributes: { candidateAge: 22 }
})

// ❌ Incorrect : les options sont lues comme un identifiant de mission
window.apieng && window.apieng("trackApplication", {
  customAttributes: { candidateAge: 22 }
})
```

Dans l’exemple incorrect, la candidature est bien comptée, mais rattachée à une mission inexistante, et les informations sur le candidat sont perdues. Aucune erreur ne s’affiche : l’oubli passe donc souvent inaperçu.

> Écrivez `undefined` **sans guillemets**. Avec des guillemets, `"undefined"` serait lu comme un identifiant de mission.

### **4.3 Les options (position ③)**

Les options s’écrivent entre accolades `{ }`. Deux options existent, cumulables :

| Option             | À quoi elle sert                                                                                                                                     | Candidature | Compte               |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- | -------------------- |
| `clientEventId`    | Votre identifiant de la candidature ou du compte. Permet de mettre à jour son statut plus tard (par exemple « acceptée »), via l’API `/v2/activity`. | ✅           | ✅                    |
| `customAttributes` | Des informations sur le candidat, par exemple son âge (`candidateAge`) ou son code postal (`candidatePostalCode`).                                   | ✅           | ❌ non pris en compte |



```js
window.apieng && window.apieng("trackApplication", "MISSION-123", {
  clientEventId: "candidature_456",
  customAttributes: { candidateAge: 22, candidatePostalCode: "89140" }
})
```

### **4.4 Nomenclature des informations candidat**

Utilisez **exactement** ces noms et formats, communs à tous les partenaires :

| Nom                   | Information              | Format                       | Exemple    |
| --------------------- | ------------------------ | ---------------------------- | ---------- |
| `candidateAge`        | Âge en années            | Nombre entier                | `22`       |
| `candidateGender`     | Civilité déclarée        | `"madame"` ou `"monsieur"`   | `"madame"` |
| `candidatePostalCode` | Code postal de résidence | 5 chiffres, entre guillemets | `"01000"`  |
| `candidateCountry`    | Pays de résidence        | Code ISO à 2 lettres         | `"FR"`     |

**Règles**

* Respectez les majuscules : `candidateAge`, pas `CandidateAge`.
* Code postal : **uniquement 5 chiffres**. Tout autre contenu (texte, pays, champ vide) : n’envoyez pas le champ.
* Information inconnue : n’envoyez pas le champ (pas de `0`, pas de `""`).

{% hint style="info" %}
**Autres informations**\
Vous pouvez ajouter librement vos propres attributs (ex. `niveauEtudes: "bac"`). Seule limite : aucune donnée identifiante (nom, email, téléphone, adresse, numéro de sécurité sociale).
{% endhint %}

## **5. Exemples prêts à copier**

**Candidature**

| Vous avez…                                   | Commande                                                                                                                                          |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Rien d’autre                                 | `window.apieng && window.apieng("trackApplication")`                                                                                              |
| L’identifiant de mission                     | `window.apieng && window.apieng("trackApplication", "MISSION-123")`                                                                               |
| L’identifiant de mission et des options      | `window.apieng && window.apieng("trackApplication", "MISSION-123", { clientEventId: "candidature_456", customAttributes: { candidateAge: 22 } })` |
| Des options, **sans** identifiant de mission | `window.apieng && window.apieng("trackApplication", undefined, { clientEventId: "candidature_456", customAttributes: { candidateAge: 22 } })`     |

**Création de compte**

| Vous avez…                                                   | Commande                                                                                         |
| ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------ |
| Rien d’autre                                                 | `window.apieng && window.apieng("trackAccount")`                                                 |
| L’identifiant de mission                                     | `window.apieng && window.apieng("trackAccount", "MISSION-123")`                                  |
| L’identifiant de mission et votre identifiant de compte      | `window.apieng && window.apieng("trackAccount", "MISSION-123", { clientEventId: "compte_789" })` |
| Votre identifiant de compte, **sans** identifiant de mission | `window.apieng && window.apieng("trackAccount", undefined, { clientEventId: "compte_789" })`     |

**Erreurs fréquentes**

| Erreur                                 | Conséquence                      | Correction                            |
| -------------------------------------- | -------------------------------- | ------------------------------------- |
| Options en position ② sans `undefined` | Mission erronée, options perdues | Ajouter `undefined` en position ②     |
| `"undefined"` entre guillemets         | Mission nommée « undefined »     | Retirer les guillemets                |
| Commande au clic sur « Postuler »      | Candidatures comptées à tort     | Déclencher après confirmation         |
| Page de confirmation rechargeable      | Candidatures en double           | Déclencher une seule fois             |
| Tag absent de la page de confirmation  | Rien n’est compté                | Installer le tag sur toutes les pages |

## 6. Où retrouver ces commandes ?

Vous pouvez trouver cette commande sur votre **espace partenaire** dans la partie [**Paramètres &#x20;**_**>  Tracking des événements**_](https://app.api-engagement.beta.gouv.fr/settings/tracking)

<figure><img src="../../../.gitbook/assets/image (11).png" alt=""><figcaption></figcaption></figure>

