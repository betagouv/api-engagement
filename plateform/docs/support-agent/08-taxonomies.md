# Taxonomies

## Rôle

Les taxonomies constituent le vocabulaire partagé entre le quiz, le scoring utilisateur, l'enrichissement des missions, les filtres et le matching. Une valeur est identifiée par la forme `taxonomie.valeur`. Le package partagé fournit la liste, les libellés, sous-libellés, icônes et indicateurs d'activation.

Le catalogue global d'options du quiz est généré depuis ce package. Une valeur `disabled` reste visible dans les écrans qui la sélectionnent mais n'est pas sélectionnable ; l'interface indique que ces options seront bientôt disponibles. Dans le catalogue de missions, une valeur `hidden` n'est pas proposée comme filtre.

## Usages dans le quiz

- `tranche_age` est résolue à partir des paramètres d'âge et de handicap.
- `handicap`, `statut`, `type_mission` et `motivation` structurent les premières réponses.
- `location` utilise des paramètres géographiques.
- `engagement_intent`, `domaine`, `formation_onisep`, `competence_rome`, `secteur_activite`, `servir_pays` et `region_internationale` sont alimentées par les étapes de précision.

Les réponses multi-sélection produisent une entrée de scoring distincte par valeur. Les réponses paramétrées sont transformées côté service de scoring par les transformers du package lorsque la taxonomie le prévoit.

## Usages dans le matching

Les taxonomies enrichissables peuvent contribuer au score lorsqu'elles sont déclarées dans la version active du moteur. Les gates contrôlent l'éligibilité sans poids de ranking. L'ajout d'une taxonomie au référentiel global ne l'active pas automatiquement dans une version du matching : elle doit être ajoutée explicitement à sa configuration.

## Liste des Taxonomies

| Clé                  | Finalité                              | Valeurs possibles                                                                                       |
|----------------------|---------------------------------------|---------------------------------------------------------------------------------------------------------|
| domaine              | ENRICHIE PAR LLM                      | Santé et soins, Social et solidarité, Environnement et nature, Sport et animation sportive, etc.         |
| domaine_engagement   | ENRICHIE PAR LLM                      | Santé et bien-être, Sport, Solidarité et inclusion, Environnement et animaux, etc.                       |
| secteur_activite     | ENRICHIE PAR LLM                      | Santé, social et aide à la personne, Éducation, formation et animation, Sécurité et service public, etc. |
| type_mission         | ENRICHIE PAR LLM                      | Mission ponctuelle, Mission régulière, Mission à temps plein, Je ne sais pas encore                      |
| rythme               | ENRICHIE PAR LLM                      | Une mission ponctuelle, sur une journée, Quelques heures par semaine, Plusieurs jours par semaine, etc.   |
| dispositif           | DÉCLARATIVE/DÉRIVÉE                   | Bénévolat, Service civique, Pompiers volontaires, Réserve Gendarmerie, etc.                              |
| competence_rome      | ENRICHIE PAR LLM                      | Management, social, soin, Communication, création, innovation, nouvelles technologies, etc.              |
| region_internationale| ENRICHIE PAR LLM                      | Europe, Afrique, Amérique, Asie, Je ne sais pas encore                                                   |
| engagement_intent    | ENRICHIE PAR LLM                      | Aide directe aux personnes, Transmission, Animation, Action terrain, etc.                                |
| activite             | ENRICHIE PAR LLM                      | Aider et accompagner des personnes, Transmettre et animer, Fabriquer, réparer ou agir sur le terrain, etc.|
| equipe               | ENRICHIE PAR LLM                      | Plutôt en autonomie, Dans un petit groupe, Dans un grand collectif, Peu importe                          |
| interaction          | ENRICHIE PAR LLM                      | J’aime échanger et agir avec les autres, J’aime alterner les moments en groupe et en autonomie, etc.     |
| autonomie            | ENRICHIE PAR LLM                      | On me donne un objectif et je m’organise librement, J’aime être accompagné·e au début, etc.              |
| imprevu              | ENRICHIE PAR LLM                      | J’aime quand il faut s’adapter rapidement, Un peu d’imprévu, ça me va, Je préfère savoir à quoi m’attendre|
| formation_onisep     | ENRICHIE PAR LLM                      | Environnement, nature et sciences, Numérique et communication, Commerce, gestion, finance et services, etc.|
| motivation_recherche | ENRICHIE PAR LLM                      | J'ai besoin d'une première expérience, J'aimerais rencontrer de nouvelles personnes, etc.                |
| statut               | DÉCLARATIVE/DÉRIVÉE                   | Je suis au lycée, Je fais des études, Je recherche un emploi, J’ai une activité professionnelle, Autre   |
| handicap             | DÉCLARATIVE/DÉRIVÉE                   | Oui, Non, Je préfère ne pas répondre                                                                     |
| mobilite             | DÉCLARATIVE/DÉRIVÉE                   | À pied / en transports en commun, En vélo, En voiture                                                    |
| motivation           | DÉCLARATIVE/DÉRIVÉE                   | Me sentir utile, rencontrer de nouvelles personnes, Booster mon dossier Parcoursup, etc.                 |
| parcoursup_formation | DÉCLARATIVE/DÉRIVÉE                   | Oui, Non                                                                                                 |
| servir_pays          | DÉCLARATIVE/DÉRIVÉE                   | Armée, Pompiers, Gendarmerie, Police, Je ne sais pas, Aucun                                              |
| location             | DÉCLARATIVE/DÉRIVÉE                   | Résolue par transformer                                                                                  |
| departmentCode       | DÉCLARATIVE/DÉRIVÉE                   | Résolue par transformer                                                                                  |
| tranche_age          | GATE D'ÉLIGIBILITÉ                    | Moins de 18 ans, 18-25 ans, 25-30 ans, 30-45 ans, 46-67 ans, 68-72 ans, 72 ans et plus                   |

## Synthèse

Les taxonomies enrichies par LLM incluent : `domaine`, `domaine_engagement`, `secteur_activite`, `type_mission`, `rythme`, `competence_rome`, `region_internationale`, `engagement_intent`, `activite`, `equipe`, `interaction`, `autonomie`, `imprevu`, `formation_onisep`, et `motivation_recherche`.

Les taxonomies uniquement déclaratives ou dérivées incluent : `dispositif`, `statut`, `handicap`, `mobilite`, `motivation`, `parcoursup_formation`, `servir_pays`, `location`, `departmentCode`, et `tranche_age`.

## Sources

- `packages/taxonomy/src/taxonomy.ts`
- `packages/taxonomy/src/types.ts`
- `packages/taxonomy/src/utils.ts`
- `packages/taxonomy/src/transformers/tranche-age.ts`
- `plateform/app/config/quiz-options.ts`
- `api/src/services/matching-engine/config.ts`
