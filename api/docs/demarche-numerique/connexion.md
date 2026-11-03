---
description: Connecter vos démarches Démarche Numérique à API Engagement pour remonter les candidatures.
---

# Connecter vos démarches Démarche Numérique

Si vos candidatures passent par une démarche [Démarche Numérique](https://demarche.numerique.gouv.fr) (ex-Démarches Simplifiées), API Engagement lit les dossiers déposés pour les rattacher aux redirections de vos missions et comptabiliser les candidatures.

Pour cela, API Engagement doit avoir accès en lecture à vos démarches. Deux modes de connexion sont possibles.

## Option 1 : ajouter API Engagement à votre organisation

Ajoutez le compte API Engagement (adresse communiquée par l'équipe) comme administrateur de chaque démarche concernée. Nous utilisons alors notre propre accès : vous n'avez rien d'autre à faire.

## Option 2 : nous transmettre un token API

Si vous ne souhaitez pas ajouter de compte externe à votre organisation, vous pouvez créer un token API et nous le transmettre. Documentation officielle : [Jeton d'authentification](https://doc.demarches-simplifiees.fr/api-graphql/jeton-dauthentification).

1. Connectez-vous à Démarche Numérique avec un **compte administrateur** des démarches concernées.
2. Cliquez sur **« Voir mon profil »**, puis sur **« Créer et afficher un nouveau jeton »**.
3. Choisissez **« Accès à une liste fermée de démarches »** et sélectionnez uniquement les démarches à connecter (recommandé plutôt que l'accès à toutes les démarches).
4. Choisissez un accès en **lecture seule** : API Engagement n'écrit rien dans vos dossiers.
5. Restriction par adresse IP : choisissez **« Réseaux personnalisés »** et saisissez les adresses IP communiquées par l'équipe API Engagement. Cette restriction est obligatoire pour les tokens créés depuis le 1er juillet 2026.
6. Copiez le token : **il n'est affiché qu'à sa création**.

Transmettez ensuite le token à l'équipe API Engagement par un canal sécurisé (pas en clair dans un e-mail ou un ticket partagé). Il est stocké chiffré et n'est jamais réaffiché.

{% hint style="info" %}
Si le token expire ou est révoqué, les candidatures ne remontent plus : créez-en un nouveau et transmettez-le-nous.
{% endhint %}

## Préparer la démarche

Quel que soit le mode de connexion, chaque démarche doit contenir une **annotation privée** de type texte intitulée **« Identifiant de la redirection »**. API Engagement la préremplit avec l'identifiant de la redirection quand un candidat arrive depuis une mission diffusée, ce qui permet de rattacher le dossier déposé à cette redirection.
