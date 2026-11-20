---
description: >-
  Cet article explique comment mesurer les impressions et envoyer l'information
  à l'API Engagement de manière automatique.
---

# Par la mise en place d'un tag (ou pixel) sur votre site

## Étape 1 : Rajouter la balise "API Engagement" sur votre site&#x20;

La Balise API Engagement, doit être ajoutée en haut de la balise `<head>` et avant tout autre script ou balise CSS.&#x20;

```html
<script>
(function (i, s, o, g, r, a, m) {
i["ApiEngagementObject"] = r; (i[r] = i[r] || function () { (i[r].q = i[r].q || []).push(arguments); }), (i[r].l = 1 * new Date()); (a = s.createElement(o)), (m = s.getElementsByTagName(o)[0]); a.async = 1; a.src = g; m.parentNode.insertBefore(a, m);
})(window, document, "script", "https://app.api-engagement.beta.gouv.fr/jstag.js", "apieng");
apieng("config", "votre-id-de-partenaire");
</script>
```



Ce script effectue **trois actions** principales :&#x20;

1. **Crée un élément** `<script>` pour démarrer le téléchargement asynchrone de la bibliothèque JavaScript jstag.js depuis https://app.api-engagement.beta.gouv.fr/jstag.js
2. **Initialise une fonction** globale apieng (appelée "file d'attente de commandes apieng()") permettant de planifier l'exécution des commandes une fois la bibliothèque jstag.js chargée et prête à être utilisée
3. **Ajoute la commande `apieng()`** à la varaiable `window` qui permet d'accéder à toutes les fonctionnalités de tracking de l'API Engagement.



## Étape 2 : S'assurer que le lien de redirection de l'API est visible sur le bouton (ou la bannière)

* Pour le vérifier, il vous suffit de faire clic droit, puis "Inspecter". Dans la console, vous devez voir un lien dans la balise de type \<a href="https://api.api-engagement.beta.gouv.fr/r/......."> \</a>
* Si ce lien est visible, alors il n'y a rien de plus à faire et l'API pourra tracker les impressions.

⚠️ S'il n'est pas possible de mettre le lien visible tel que mentionné ci-dessus, consultez l'[alternative expliquée ci-dessous](par-la-mise-en-place-dun-tag-ou-pixel-sur-votre-site.md#altenative-tracking-des-impressions-par-le-pixel-utilisable-dans-le-contexte-de-la-diffusion-de-miss) :&#x20;

<figure><img src="../../../.gitbook/assets/image (15).png" alt=""><figcaption><p>Exemple de lien de redirection visible pour une diffusion par API</p></figcaption></figure>

<figure><img src="../../../.gitbook/assets/image (16).png" alt=""><figcaption><p>Exemple de lien de redirection visible pour une diffusion par lien tracké</p></figcaption></figure>



## Alternative : Tracking des impressions par le pixel (utilisable dans le contexte de la diffusion de missions par API ou pour les liens trackés)

* **Le rajout de la balise décrite en (1.) reste requis.** Cependant, si l'implémentation décrite en (2.) ne convient pas, alors il est possible de tracker les impressions via la méthode du pixel.
* Sur le bouton (ou la bannière) qui sert à rediriger les utilisateurs vers la page cible (de l'annonceur), vous devez ajouter une balise \<span> de la forme suivante :

```
<span name="tracker_counter" data-id="mission_id" /> 
```

où `tracker_counter` n’est pas à changer (c’est avec ce nom que le script retrouve le tracker) et `mission_id` est l’identifiant que l’API fournit de la mission.
