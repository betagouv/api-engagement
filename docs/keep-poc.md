# POC Keep vs alerting full in-house : rapport

Date : 16/10/2026. PR de référence : POC Keep [#1602](https://github.com/betagouv/api-engagement/pull/1602), version in-house [#1603](https://github.com/betagouv/api-engagement/pull/1603). Les deux sont en draft, empilées sur [#1598](https://github.com/betagouv/api-engagement/pull/1598) (`deploymentUserId`, `expectedApplications`).

## 1. Contexte et questions

Les alertes métier sont détectées dans Metabase puis envoyées en webhook. Il faut les attribuer à un ou plusieurs utilisateurs, notifier, suivre le traitement (à faire / en cours / résolue) et pouvoir clore par réponse au mail. À terme, des alertes techniques (Sentry, Grafana Scaleway) pourraient s'y ajouter.

Deux questions :
1. Keep est-il pérenne, pour une alerte générique et pour des alertes plus complexes ?
2. Sa maintenance coûte-t-elle plus ou moins qu'un système full in-house ?

## 2. Ce qui a été construit

| | POC Keep (#1602) | In-house (#1603) |
|---|---|---|
| Récepteur d'alertes | Keep 0.54.3 (API FastAPI, UI Next.js, Postgres) | `POST /warning/webhook` sur l'API existante |
| Stockage | Base de Keep (séparée) | Table `Warning` existante + `status`, `procedureUrl`, `escalatedAt`, table `warning_assignee` |
| Notification | Workflow YAML qui appelle `POST /alerts-poc/notify` (lookup + Brevo) | Service `warning-alert` (Brevo `sendTemplate`) |
| Suivi du statut | UI Keep, puis write-back `POST /alerts-poc/status` | `PUT /warning/:id/status`, `fixed` synchronisé : les vues `app/` existantes marchent |
| Infra | Terraform : base managée, 2 conteneurs (`keep.tf`) | Aucune, 2 variables d'environnement |
| Tests | Manuels (scripts, API Keep) | 12 tests d'intégration verts |

## 3. Résultats par scénario

Légende : OK / OK avec glue (code à nous) / Limité / KO / Non testé.

| Scénario | Keep | In-house |
|---|---|---|
| **S1** Alerte générique de bout en bout (webhook → destinataire → mail) | OK avec glue : il faut un endpoint API pour retrouver le responsable et envoyer le mail | OK |
| **S2** Statuts et suivi | OK (acknowledged / resolved, write-back par workflow). Deux changements rapprochés donnent deux exécutions qui lisent le statut final | OK |
| **S2** Assignation à un ou plusieurs utilisateurs | Limité : `assignee` est un texte libre posé via l'API, pas une relation vers un utilisateur, pas multiple | OK (table d'assignation, seuls les nouveaux assignés sont notifiés) |
| **S3** Réponse au mail pour clore | Non implémenté : exige de toute façon notre glue (Brevo inbound → API Keep) | OK (`[ALERTE:<id>]` dans l'objet, expéditeur vérifié) |
| **S3** Slack interactif | Non testé (pas de workspace de test). La doc ne décrit que l'envoi de messages | Non testé, hors périmètre |
| **S4** Déduplication | OK sur le stockage (1 alerte pour 10 événements), mais le workflow renotifiait à chaque événement tant qu'on n'a pas ajouté `only_on_change: status` | OK (alerte ouverte incrémentée, 1 seul mail) |
| **S4** Retour du problème après résolution | Limité : si le statut `resolved` a été posé à la main, un nouvel événement `firing` ne rouvre pas l'alerte et ne renotifie pas. Piloté par événement (`resolved` puis `firing`), la renotification marche | OK (une alerte résolue est fermée : le problème qui revient crée une nouvelle alerte et notifie) |
| **S4** Corrélation (plusieurs alertes d'un même annonceur) | OK : une règle (`groupingCriteria: labels.publisher_id`) regroupe 3 alertes en 1 incident. Les règles se créent dans la base, pas par provisioning | Limité : les alertes d'un annonceur sont regroupées à l'affichage, mais pas de notion d'incident ni de mail groupé |
| **S4** Escalade (non traité après X heures) | KO dans le temps imparti : le workflow `interval` tourne, mais l'action d'escalade ne s'est jamais déclenchée, sans erreur. Un filtre CEL invalide renvoie une liste vide sans message | OK (relance unique des alertes « à faire » trop anciennes, branchée sur le job `warnings` existant) |
| **S4** Multi-sources (Sentry, Grafana) | OK : le format Grafana est reconnu nativement, Sentry par événement générique, tout dans une même vue | KO structurel : `Warning.publisherId` est obligatoire, une alerte technique sans annonceur ne rentre pas dans le modèle |
| **S4** Multi-destinataires | Limité (voir assignation) | OK |
| **S5** Provisioning / GitOps | Workflows en YAML versionnés, chargés par API ou par `KEEP_WORKFLOWS_DIRECTORY` (image dédiée) ; providers par `KEEP_PROVIDERS`. Règles de corrélation non provisionnables | Le code est la configuration |
| **S5** Montée de version avec migration | Non testé | Migrations Prisma classiques |
| **S5** Export des données | Non testé (la base Postgres et `/alerts/query` le permettent) | Données déjà dans notre Postgres, exportables vers analytics comme les autres tables |

Ce qui n'a été testé dans aucune des deux versions : un vrai canal webhook Metabase (le format du payload reste à confirmer), l'envoi Brevo réel (pas de clé en local, le mail est journalisé), SPF/DKIM sur les réponses par mail, Slack interactif.

## 4. Pérennité de Keep

- **Licence.** MIT, sauf le dossier `ee/` sous licence propriétaire (usage en production soumis à un abonnement). En OSS : authentification `DB` (RBAC avec rôles prédéfinis, sans SSO), Oauth2Proxy, Okta, OneLogin. Auth0, Keycloak et Azure AD sont en EE.
- **Propriété.** Elastic a racheté Keep en mai 2025 et annonce qu'il reste open source ; la feuille de route dépend désormais d'Elastic.
- **Activité.** 30 releases en 14 mois (environ 2 par mois), dernière release le 09/09/2026 (0.54.3). 34 commits sur les 3 derniers mois et 657 issues ouvertes : le rythme est sensiblement plus bas qu'avant. Le projet n'est pas archivé.
- **Version.** Toujours en 0.x : pas de promesse de stabilité d'API ni de workflows.
- **Maturité observée.** Plusieurs comportements silencieux ont coûté du temps : format des headers d'un provider, filtre CEL invalide, condition `if` d'un `foreach`, droits du volume `/state`. Les erreurs de format n'apparaissent qu'à l'exécution. La réponse de l'installation d'un provider renvoie ses secrets en clair. La télémétrie PostHog/Sentry vers Keep est active par défaut (désactivée par variable d'environnement dans notre config).

Verdict pérennité : utilisable aujourd'hui, mais une dépendance à un produit en 0.x, dont le rythme ralentit, et dont la configuration avancée (règles, escalade) est moins robuste et moins bien outillée que le reste de notre stack. Pour une alerte générique, le risque est faible ; pour des alertes complexes, il est réel.

## 5. Coût de maintenance

Estimations de l'auteur, à lire comme des ordres de grandeur.

| Poste | Keep | In-house |
|---|---|---|
| Mise en route | Stack + workflows + endpoints de glue : environ 2 à 3 j, plus environ 1,5 j de Terraform (`keep.tf`) et de CI pour l'image des workflows | Environ 3 j pour S1 à S4, tests inclus |
| Nouvelle infra à exploiter | Base managée dédiée (facturée en continu), 2 conteneurs dont 1 toujours allumé, secrets, sauvegardes, supervision | Aucune |
| Veille et montées de version | Releases tous les 15 jours environ, migrations de base de Keep à rejouer, tests de non-régression des workflows : environ 1 à 2 j / trimestre | Intégré aux montées de dépendances habituelles |
| Comptes et droits | Second annuaire d'utilisateurs (ou SSO via Oauth2Proxy/Okta) | Les utilisateurs de l'app |
| Double source de vérité | Oui : le statut vit dans Keep, il faut le recopier dans Postgres pour Metabase (write-back à fiabiliser et rejouer) | Non |
| Compétences | Un outil de plus (Python/FastAPI, CEL, syntaxe de workflows) | La stack de l'équipe |
| Ce qu'il reste à construire | UI de suivi : fournie. Réponse par mail, assignation réelle, escalade : à nous ou impossible | UI de suivi dans `app/` (statuts, assignation, relance) : environ 2 à 3 j |
| Alertes techniques | Prises en charge nativement | Modèle à étendre (alertes sans annonceur) |

Lecture : Keep supprime le travail d'interface et prend en charge les sources techniques, mais ajoute une infra, une double source de vérité et une maintenance récurrente. Pour le périmètre métier, il ne supprime presque aucun code : les parties qui comptent (lookup du responsable, mail, réponse par mail, write-back) restent à notre charge.

## 6. Recommandation

1. **Alertes métier : full in-house**, en s'appuyant sur la table `Warning` (#1603). Critère « No-go Keep » du plan atteint : assignation réelle, réponse par mail et write-back exigent du code comparable à un endpoint et une table, et le statut doit de toute façon vivre dans notre Postgres pour Metabase.
2. **Alertes techniques : ne pas déployer Keep pour l'instant.** Le relais `sentry-webhook` vers Slack fonctionne, Grafana Scaleway peut poster en webhook ou sur Slack. Keep devient intéressant si l'on veut une boîte unique pour plusieurs sources avec corrélation et déduplication ; à réévaluer alors, sur le besoin réel.
3. **Si Keep est retenu plus tard**, prévoir : `only_on_change`, politique de statut manuel (sticky) clarifiée, règles de corrélation hors provisioning, supervision de la base managée, test de montée de version avant la prod.

## 7. Suites proposées

- Valider avec un vrai canal webhook Metabase le format du payload et l'adapter dans `POST /warning/webhook` (la requête doit renvoyer une ligne par annonceur, avec le lien de procédure Notion).
- Affichage du statut, de l'assignation et de la relance dans `app/` (les vues `admin-warning` et `warnings` sont déjà branchées sur `Warning`).
- Export de `Warning` vers analytics, comme les autres tables, pour le suivi dans Metabase.
- Remplacer `checkTracking` par l'alerte Metabase, une fois le parcours validé.
- Si un Slack interactif est voulu : le tester dans un workspace de test avant de comparer.
