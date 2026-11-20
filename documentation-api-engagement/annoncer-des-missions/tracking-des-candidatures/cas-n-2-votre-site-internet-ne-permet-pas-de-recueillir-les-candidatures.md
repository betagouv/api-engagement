# Cas n°2 : Votre site internet ne permet pas de recueillir les candidatures

L’intégration avec Démarches Numériques ne nécessite pas l’installation du JSTag ni l’intervention d’un prestataire web.

Pour les organisations utilisant Démarches Numériques, une seule modification est nécessaire dans chaque formulaire : créer une annotation privée appelée exactement **“Identifiant de la redirection”.**

L’équipe API Engagement se charge ensuite de configurer le suivi et de mettre à jour les liens de destination.

### **Ce que vous devez faire**

Pour chaque formulaire Démarches Numériques utilisé pour recueillir des candidatures :

1. ouvrez la page de configuration du formulaire dans Démarches Numériques ;
2. ajoutez une annotation privée ;
3. nommez-la exactement "Identifiant de la redirection" ;
4. publiez la nouvelle version du formulaire ;
5. transmettez l’URL publique de la démarche à l’équipe API Engagement.

### **Étape 1 : Ajouter l’annotation privée**

Dans la configuration de votre démarche, créez une nouvelle **annotation privée**.

Utilisez exactement le libellé suivant : "Identifiant de la redirection". Le libellé doit être strictement identique. Conservez les espaces et l’orthographe indiqués. Le rapprochement automatique repose sur le nom de ce champ.

L’annotation doit rester privée afin :

* qu’elle ne soit pas visible par la personne candidate ;
* qu’elle ne puisse pas être modifiée ou supprimée pendant le dépôt du dossier par le candidat sur Démarches Numériques ;
* que l’API Engagement puisse y inscrire automatiquement l’identifiant de la redirection.

Vous n’avez aucune valeur à saisir dans cette annotation. Elle sera remplie automatiquement lorsqu’une personne accédera à la démarche depuis une offre diffusée par l’API Engagement.

### **Étape 2 : Transmettre l’URL de la démarche**

Envoyez à la personne chargée de votre déploiement :

* l’URL publique du formulaire Démarches Numériques ;
* la confirmation que l’annotation privée a été créée ;
* la liste des formulaires concernés si vous en utilisez plusieurs.

Ne transmettez pas l’URL de la page d’administration. L’équipe API Engagement a besoin du lien utilisé par les personnes candidates pour accéder à la démarche.

### **Étape 3 : Attendre la confirmation d’activation**

À réception de ces éléments, l’équipe API Engagement :

* associe la démarche à votre compte API Engagement ;
* configure le suivi des dossiers déposés ;
* met à jour les campagnes de diffusion existantes lorsque cela est nécessaire ;
* réalise un test du parcours.

Attendez la confirmation de l’équipe avant de considérer l’intégration comme opérationnelle.

### **Checklist Démarches Numériques**

Votre intervention est terminée lorsque :

* l’annotation privée a été créée ;
* elle porte exactement le nom Identifiant de la redirection ;
* elle est présente dans chaque formulaire Démarches Numériques concerné ;
* l’URL publique de chaque démarche a été transmise ;
* l’équipe API Engagement a confirmé l’activation.
