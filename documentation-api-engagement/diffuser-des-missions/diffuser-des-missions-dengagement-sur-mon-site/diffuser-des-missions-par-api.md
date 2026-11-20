---
description: >-
  L'API vous donne accès aux données brutes des missions : c'est vous qui
  construisez l'affichage. Cette page décrit les 4 étapes de mise en place et
  les règles d'affichage à respecter.
---

# Diffuser des missions par API

## Étape 1 : créer une clé API dans le tableau de bord

Votre clé API est disponible directement dans votre compte API Engagement : vous la générez vous-même, sans avoir à la demander à quelqu'un ni à la recevoir par e-mail.



**Si vous avez déjà un compte**

1. Connectez-vous au tableau de bord API Engagement.
2. Allez dans **Diffuser des missions > Flux par API**.
3. Cliquez sur **Générer ma clé API** (ou **Régénérer** si vous en aviez déjà une), puis copiez-la.

<figure><img src="../../.gitbook/assets/image (8).png" alt=""><figcaption></figcaption></figure>



**Si vous n'avez pas encore de compte**

{% hint style="danger" %}
**Cette étape nécessite l'aide d'un chargé de déploiement** avec qui vous êtes en contact. Cette personne pourra générer cette clé pour vous.
{% endhint %}

Rapprochez-vous de votre chargé de déploiement : il crée votre compte diffuseur, active l'accès API et vous envoie une invitation. Vous recevez alors un e-mail pour définir votre mot de passe, puis vous suivez les 3 étapes ci-dessus.

> **Bon à savoir.** Votre clé donne accès aux données de missions et à vos statistiques de diffusion (clics, candidatures). Elle ne doit jamais circuler par e-mail ou par messagerie, y compris avec l'équipe API Engagement : personne n'a besoin de vous la transmettre, ni de vous la demander. En cas de doute sur sa confidentialité, régénérez-la depuis cette même page, l'ancienne clé est immédiatement désactivée.

## Étape 2 : récupérer les missions

L'endpoint `/mission` renvoie les missions qui vous sont disponibles, selon les règles de diffusion fixées avec les annonceurs. [Voir la documentation de l'endpoint](https://app.gitbook.com/s/ubkRP59ZFCzK5T16bZo1/mission-mission/recuperer).

Le détail de chaque champ est décrit dans le [modèle de données d'une mission](../modele-de-donnees-dune-mission-dengagement.md).

{% hint style="warning" %}
**Synchronisez régulièrement.** Les missions évoluent tous les jours (places pourvues, missions clôturées, dates modifiées). Une mission expirée encore affichée sur votre site génère des candidatures qui n'aboutiront pas. Mettez à jour votre catalogue au moins une fois par jour.
{% endhint %}

## Étape 3 : formater le visuel des missions récupérées via l'API sur votre site

#### Ce qu'on attend d'une bonne intégration

En quelques secondes, la personne qui consulte votre site doit comprendre :

* **quoi** : ce qu'elle fera concrètement ;
* **où** : le lieu de la mission, ou si elle peut se faire à distance ;
* **quand et à quel rythme** ;
* **pour qui** : le public aidé, et si la mission lui est accessible ;
* **comment candidater** : un bouton clair.

#### Trois règles indispensables

> 🚨 **1. Localisez précisément chaque mission.** L'engagement est local : la localisation est le premier critère de choix. Utilisez le tableau `addresses` (ville, code postal, département, coordonnées) et proposez une recherche par lieu avec autocomplétion et géolocalisation. Une mission peut avoir plusieurs adresses : affichez-les toutes ou la plus proche de l'utilisateur. Les missions à distance (`remote` = `full` ou `possible`) doivent être signalées comme telles.
>
> _Sur un de nos flux de diffusion, la seule correction de la localisation des missions a multiplié par 2,4 le nombre de candidatures, sans aucune autre modification._

> 🚨 **2. N'affichez que des missions accessibles à votre public.** Si votre site s'adresse à des mineurs, filtrez sur `openToMinors`. Si votre public a une tranche d'âge ou un profil particulier, parlez-en à votre chargé de déploiement pour adapter vos règles de diffusion. [Ne déduisez jamais un âge minimum à partir de `openToMinors`](#user-content-fn-1)[^1] : certaines missions exigent un âge supérieur à 18 ans, précisé dans la description.

> 🚨 **3. Redirigez vers `applicationUrl` avec le tracking.** Le bouton de candidature mène à `applicationUrl`, avec le tracking décrit à l'étape 4. Un seul bouton principal, avec un libellé explicite (« Je candidate », « Je m'engage »), visible sans avoir à faire défiler la page.

#### Page 1 : la liste des missions

**Ce qu'il faut afficher sur chaque carte mission**

| Élément                                                                            | Champ API                                          | Niveau      |
| ---------------------------------------------------------------------------------- | -------------------------------------------------- | ----------- |
| Titre                                                                              | `title`                                            | Obligatoire |
| Structure d'accueil                                                                | `organizationName`                                 | Obligatoire |
| Ville et code postal (ou « À distance » ou "Près de chez moi" si remote = `local`) | `addresses.city`, `addresses.postalCode`, `remote` | Obligatoire |
| Image                                                                              | `image`                                            | Obligatoire |
| Domaine                                                                            | `domain`                                           | Obligatoire |
| Type d'engagement (bénévolat, Service Civique, etc.)                               | `type`                                             | Recommandé  |
| Date de début                                                                      | `startAt`                                          | Recommandé  |
| Badges « Dès 16 ans », « À distance »                                              | `openToMinors`, `remote`                           | Recommandé  |

> 💡 Le champ `image` est toujours renseigné : si l'annonceur n'a pas fourni d'image, l'API Engagement en attribue une selon le domaine. Des cartes sans image se ressemblent toutes et sont moins cliquées.

**Filtres recommandés**

* **Localisation** : autocomplétion sur la ville et bouton « autour de moi » ;
* **Domaine** ;
* **Type d'engagement** ;
* **À distance** ;
* **Ouvert aux mineurs** ;
* **Dates** (début de mission).

Les filtres disponibles côté API sont listés dans la référence de l'endpoint `/mission`.

**Dès l'arrivée sur la page**, affichez des missions (les plus proches de l'utilisateur, ou une sélection) plutôt qu'un formulaire de recherche vide.



_Exemple 1 : JeVeuxAider.gouv.fr_

<figure><img src="../../.gitbook/assets/image (35).png" alt=""><figcaption></figcaption></figure>



#### Page 2 : le détail d'une mission

**Les blocs à afficher**

| Bloc                                                                             | Champs API                                                                                |
| -------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| En-tête : titre, structure, logo, image                                          | `title`, `organizationName`, `organizationLogo`, `image`                                  |
| Informations clés : lieu, dates, rythme, distanciel, places, domaines, activités | `addresses`, `startAt`, `endAt`, `schedule`, `remote`, `places`, `domain`, `activities`   |
| Bouton de candidature ("Candidater")                                             | `applicationUrl` (avec tracking)                                                          |
| Description de la mission                                                        | `description`                                                                             |
| Public aidé                                                                      | `audience`                                                                                |
| Prérequis                                                                        | `requirements`                                                                            |
| Accessibilité (parfois vide)                                                     | `reducedMobilityAccessible`, `closeToTransport`                                           |
| Indemnisation (volontariat, pompiers, réserves)                                  | `compensationAmount`, `compensationAmountMax` `compensationUnit`, `compensationType`      |
| Présentation de la structure                                                     | `organizationDescription`, `organizationUrl`, `organizationLogo`                          |

**La description**

Les annonceurs peuvent fournir leur description en HTML (titres, listes, gras). Affichez-la **en HTML, après nettoyage** (suppression des scripts et styles) : un texte brut sans sauts de ligne devient un bloc illisible, et les informations importantes (conditions, âge, durée du processus de sélection) s'y perdent.

Affichez les champs structurés (`audience`, `requirements`, `schedule`) dans des blocs dédiés, en plus de la description : ce sont les informations que les candidats cherchent en premier.

\[CAPTURE 2 : page détail de mission, annotée]

#### Exemples d'intégration

Grimp.io

<figure><img src="../../.gitbook/assets/image (37).png" alt=""><figcaption></figcaption></figure>

<figure><img src="../../.gitbook/assets/image (41).png" alt=""><figcaption></figcaption></figure>



JeVeuxAider.gouv.fr, page mission de référence

<figure><img src="../../.gitbook/assets/image (38).png" alt=""><figcaption></figcaption></figure>

<figure><img src="../../.gitbook/assets/image (40).png" alt=""><figcaption></figcaption></figure>

#### Erreurs fréquentes

| À éviter                                                                   | Conséquence                                 | À faire                                                         |
| -------------------------------------------------------------------------- | ------------------------------------------- | --------------------------------------------------------------- |
| Champ de localisation sans autocomplétion, ou missions sans ville affichée | Les missions proches ne sont pas trouvées   | Recherche par ville avec autocomplétion et géolocalisation      |
| Page vide avec seulement un formulaire                                     | L'utilisateur ne voit pas l'offre et repart | Afficher des missions dès l'arrivée                             |
| Cartes sans image ni domaine                                               | Toutes les missions se ressemblent          | Afficher `image` et `domain`                                    |
| Description affichée en texte brut                                         | Bloc illisible, conditions noyées           | Rendre le HTML nettoyé et afficher les champs structurés à part |
| Missions inaccessibles à votre public (âge, statut)                        | Candidatures refusées, déception            | Filtrer (`openToMinors`) et adapter vos règles de diffusion     |
| Missions expirées encore en ligne                                          | Candidatures sans suite                     | Synchroniser au moins une fois par jour                         |

_Retrouvez plus d'informations sur notre site vitrine :_&#x20;

{% embed url="https://api-engagement.beta.gouv.fr/diffuser-les-missions-de-partenaires/#api" %}

### Étape 4 : paramétrer le tracking des diffusions de missions

> 🚨 **Cette étape est obligatoire pour pouvoir diffuser les missions de l'API Engagement.** L'article «[ Partager les données de diffusion sur mon site à l'API Engagement](../tracking-des-candidatures/) » décrit comment mettre en place le tracking obligatoire des vues que vous générerez sur votre site ou votre application.

### Avant la mise en ligne : checklist

Faites relire votre intégration par votre chargé de déploiement avec cette liste :

* [ ] Les missions sont localisées (ville et code postal, ou « À distance ») et la recherche par lieu propose l'autocomplétion
* [ ] Des missions s'affichent dès l'arrivée sur la page
* [ ] Chaque carte affiche une image, le domaine, la structure et la ville
* [ ] La description est affichée en HTML, et les blocs public, prérequis et rythme sont visibles
* [ ] Le bouton de candidature redirige vers `applicationUrl`
* [ ] Le tracking est en place et testé (étape 4)
* [ ] Le catalogue est synchronisé au moins une fois par jour

[^1]: 
