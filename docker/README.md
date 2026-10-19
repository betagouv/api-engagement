# Tunnel SSH pour les Serverless Jobs

Les images `api` et `analytics` utilisent `docker/ssh-tunnel-entrypoint.sh`, installé dans les containers sous `/workspace/docker/ssh-tunnel-entrypoint.sh`. Sans configuration, cet entrypoint exécute immédiatement la commande de l'image. Terraform fournit `SSH_TUNNEL_ENABLED` uniquement aux Serverless Jobs : le container API rejoint donc directement PostgreSQL par le VPC sans démarrer de tunnel.

Terraform génère et injecte la clé privée, ainsi que l'IP et le port du bastion depuis les ressources de la Public Gateway. Pour activer le tunnel sur les jobs, compléter la configuration suivante :

| Variable                  | Valeur                                                                                                 |
| ------------------------- | ------------------------------------------------------------------------------------------------------ |
| `SSH_TUNNEL_ENABLED`      | `true`                                                                                                 |
| `SSH_TUNNEL_URL_ENV`      | Nom de la variable contenant l’URL à adapter ; `DATABASE_URL_CORE` par défaut et pour les jobs actuels |
| `SSH_TUNNEL_BASTION_HOST` | IP publique de la Public Gateway, injectée par Terraform                                               |
| `SSH_TUNNEL_PRIVATE_KEY`  | Clé SSH privée générée et injectée directement par Terraform                                           |
| `SSH_TUNNEL_KNOWN_HOSTS`  | Entrée `known_hosts` vérifiée pour le bastion et son port, fournie comme secret                        |
| `DATABASE_URL_CORE`       | URL PostgreSQL avec son adresse privée, partagée avec le container API                                 |

Terraform fournit `SSH_TUNNEL_BASTION_PORT` depuis le port configuré sur la Public Gateway. Le port local facultatif est `SSH_TUNNEL_LOCAL_PORT` (défaut `15432`). La destination et le port sont extraits de l’URL désignée par `SSH_TUNNEL_URL_ENV`. PostgreSQL utilise le port `5432` si absent ; les autres services doivent avoir un port explicite dans leur URL. L'entrypoint vérifie la clé d'hôte SSH et attend que le tunnel soit prêt avant de lancer le job.

Lorsque `SSH_TUNNEL_ENABLED` est absent ou vaut `false`, l'entrypoint ne démarre aucun tunnel et conserve les variables d’environnement telles quelles. Le tunnel reste désactivé par défaut et aucun endpoint public de base de données n'est supprimé.

Lorsque le tunnel est activé, l'entrypoint remplace uniquement l'hôte et le port de l’URL désignée par `SSH_TUNNEL_URL_ENV` par `127.0.0.1` et le port local, dans l'environnement du processus lancé. L'utilisateur, le mot de passe, la base et les paramètres de connexion sont conservés. La valeur dans Secret Manager n'est pas modifiée : aucune seconde URL n'est nécessaire.

## Gestion de la clé SSH par Terraform

Pour chaque workspace avec `enable_public_gateway = true`, Terraform génère une paire ED25519, enregistre sa clé publique dans le projet Scaleway et rafraîchit les clés SSH du bastion de la Public Gateway. La clé privée est injectée directement dans `SSH_TUNNEL_PRIVATE_KEY` pour les jobs API et analytics, via un local partagé. Elle n'est pas fournie au container API et n'a pas besoin d'être ajoutée à Secret Manager.

La clé est conservée entre les déploiements. Elle est générée lors du premier `terraform apply`, pas à chaque lancement de job. Les workspaces sans Public Gateway ne génèrent pas de clé.

La clé privée est stockée dans le state Terraform et dans les variables d'environnement des jobs. Le caractère `sensitive` masque son affichage Terraform mais ne chiffre pas le state : protéger l'accès au bucket `api-engagement-terraform-state`.

`SSH_TUNNEL_KNOWN_HOSTS` reste à renseigner avec l'identité vérifiée du bastion ; elle est indépendante de la paire de clés générée pour les jobs.

## Migrations depuis GitHub Actions

Le workflow initialise Terraform et sélectionne le workspace avant les migrations. L’étape shell de migration lit la sortie sensible `ssh_tunnel_env_vars` du state existant, puis réutilise cet entrypoint pour lancer `npm --workspace api run prisma:migrate:deploy`. La clé SSH n'est pas recopiée dans les secrets GitHub. `DATABASE_URL_CORE` reste fournie par le secret GitHub de l'environnement, avec la destination PostgreSQL à joindre depuis le bastion.

La CI respecte `SSH_TUNNEL_ENABLED` publié dans le state : `true` active le tunnel, `false` conserve une connexion directe. La sortie Terraform est capturée en mémoire ; la clé privée et l'URL adaptée sont masquées dans les logs GitHub Actions. Un socket de contrôle SSH permet de fermer le tunnel après les migrations, y compris si Prisma échoue. Le déploiement applicatif n'a lieu qu'après leur réussite.

Avant le premier déploiement avec ce workflow, effectuer un `terraform apply` pour créer la passerelle et la clé si nécessaire, et publier la nouvelle sortie. Une sortie absente ou invalide fait échouer la migration sans tentative de connexion directe. Lors d'un changement de configuration du tunnel dans Secret Manager, appliquer Terraform avant de basculer la base ou les secrets GitHub sur l'endpoint privé : la CI lit la configuration du dernier apply, pas celle du plan à venir.

Les workspaces sans passerelle doivent garder le tunnel désactivé. La création d'un environnement neuf nécessite de provisionner l'infrastructure avant le premier lancement de migrations.
