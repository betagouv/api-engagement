---
description: >-
  Vous pouvez afficher des missions de l'API sur votre site web en quelques
  heures
---

# Diffuser des missions par widget

## Qu'est-ce que le widget API Engagement ?

Le widget permet d'afficher les missions de l'API sur un site web via un iframe (comme les cartes Google Maps sur les sites).

Vous pouvez choisir entre deux formats de widget pour assurer une intégration optimisée sur votre site web. Votre widget peut prendre la forme d'une **page de résultats de missions** ou se présenter plus discrètement dans un **carrousel de missions.**

### Widget - Page de résultats

<figure><img src="../../.gitbook/assets/image (20).png" alt=""><figcaption></figcaption></figure>

### Widget - Carrousel de missions

<figure><img src="../../.gitbook/assets/image (21).png" alt=""><figcaption></figcaption></figure>

## Comment intégrer le widget sur votre site web ?

Pour intégrer le widget, vous devez récupérer le code du widget qui se trouve dans le tableau de bord API [Diffuser des missions > Widgets de missions](https://app.api-engagement.beta.gouv.fr/broadcast/widgets).

<figure><img src="../../.gitbook/assets/image (10).png" alt=""><figcaption></figcaption></figure>



**Vous trouverez le lien du widget à intégrer en bas de page**

<figure><img src="../../.gitbook/assets/image (30).png" alt=""><figcaption></figcaption></figure>

_**Important** : ce script est conçu pour garantir une intégration optimisée sur votre site web. Le code est de la forme suivant&#x65;**.**_

```html
<iframe border="0" frameborder="0" style="display:block; width:100%;" loading="lazy" allowfullscreen allow="geolocation" src="https://xxx.api-engagement.beta.gouv.fr?widget=xxxxxxxxx"></iframe>

```

Après avoir intégré le widget sur votre site, l'utilisateur voit l'ensemble des missions disponibles. Il pourra alors **cliquer sur une mission** présente dans le widget et sera renvoyé vers le site de l'Annonceur où il pourra candidater.

## Pour une intégration réussie

Vous pouvez trouver toutes les bonnes pratiques pour maximiser l'engagement autour de votre widget API Engagement ici :&#x20;

{% embed url="https://api-engagement.beta.gouv.fr/integration-des-widgets/" %}

## Pour aller plus loin

Vous pouvez retrouver toutes les **informations** concernant les **moyens de diffusion** ici :&#x20;

{% embed url="https://api-engagement.beta.gouv.fr/diffuser-les-missions-de-partenaires/#widget" %}
