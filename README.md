# [API Engagement](https://api-engagement.beta.gouv.fr)

## Structure

L'api engagement regroupe 5 principales applications: une api, un back office, deux widgets et un serveur cron.

### Une [API](https://api.api-engagement.beta.gouv.fr)

L'api est en NodeJs avec expressJS ecrite en TypeScript
dossier `api/`

### Un [Back Office](https://app.api-engagement.beta.gouv.fr)

Le back office est une application React avec un serveur ExpressJs en production
dossier `app/`

### Un [Widget Benevolat](https://mission.api-engagement.beta.gouv.fr) et un [Widget Volontariat](https://sc.api-engagement.beta.gouv.fr)

Les deux widgets sont des applications NextJS pour optimiser le SEO
dossiers `widget-benevolat/` et `widget-volontariat/`

### Un process

Un serveur qui fait tourner plusieurs crons afin de recuperer les missions des flux XML, appliquer une moderation automatique de JVA, mettre à jour le flux vers Linkedin et recuperer les stats de ce dernier, mettre a jour la base des associations de l'API, envoyer les rapports d'impacts, dupliquer la data dans une base PostGres utiliser pour analyser la data et surveiller les bonnes stats de l'API Engagement. Les serveurs est une app ExpressJs ecrite en typescript.
