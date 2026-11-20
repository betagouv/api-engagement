---
description: >-
  Cette partie de la documentation est à destination de votre responsable
  informatique : elle présente les critères nécessaires pour créer votre flux
  XML, c’est-à-dire l’envoi d’informations vers l’API
---

# Méthode 1 : création d'un flux XML

## Introduction

Pour importer vos missions, vous devez mettre à disposition un flux XML. L'API actualise sa base de données de manière autonome en analysant le flux XML toutes les 6 heures.

Les partenaires annonceurs doivent mettre à disposition un flux XML qui sera récupéré **toutes les** **6 heures** par l’API Engagement afin de mettre à jour les missions qu’elle a en base de données.

Ce flux est accessible via une adresse (URL) qui renvoie un fichier XML. Cette adresse peut être publique, ou protégée par une authentification HTTP basique (identifiant et mot de passe) si vous souhaitez limiter l’accès au flux.&#x20;



**Protéger l’accès au flux (optionnel)**

Si vous ne souhaitez pas que votre flux soit consultable publiquement, vous pouvez le protéger par une authentification HTTP basique (« htpasswd »). Sans identifiants, le flux n’est consultable ni par une personne ni par un robot.

Si vous choisissez cette option, transmettez-nous les identifiants en même temps que l’adresse du flux.
