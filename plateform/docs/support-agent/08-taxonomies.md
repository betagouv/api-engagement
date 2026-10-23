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
| domaine              | ENRICHIE PAR LLM                      | Santé et soins, Social et solidarité, Environnement et nature, Sport et animation sportive, Culture et arts, Éducation et transmission, Sécurité et défense, International et humanitaire, Gestion de projet, Je ne sais pas encore |
| domaine_engagement   | ENRICHIE PAR LLM                      | Santé et bien-être, Sport, Solidarité et inclusion, Environnement et animaux, Art et culture, Sécurité et secours, Citoyenneté, Numérique, Éducation |
| secteur_activite     | ENRICHIE PAR LLM                      | Santé, social et aide à la personne, Éducation, formation et animation, Sécurité et service public, Environnement et agriculture, Culture, création et médias, Numérique et communication, Bâtiment, industrie et logistique, Gestion, commerce et organisation, Je ne sais pas encore |
| type_mission         | ENRICHIE PAR LLM                      | Mission ponctuelle, Mission régulière, Mission à temps plein, Je ne sais pas encore                      |
| rythme               | ENRICHIE PAR LLM                      | Une mission ponctuelle, sur une journée, Quelques heures par semaine, Plusieurs jours par semaine, Quelques jours répartis dans l’année, À temps plein pendant plusieurs mois, Je ne sais pas encore |
| dispositif           | DÉCLARATIVE/DÉRIVÉE                   | Bénévolat, Service civique, Pompiers volontaires, Réserve Gendarmerie, Réserve Police Nationale, Réserves des armées |
| competence_rome      | ENRICHIE PAR LLM                      | Management, social, soin, Communication, création, innovation, nouvelles technologies, Production, construction, qualité, logistique, Gestion, pilotage, juridique, Relation client, commerce, stratégie, Coopération, organisation, soft skills, Protection des personnes, de la société ou de l'environnement, Autre / Je ne sais pas |
| region_internationale| ENRICHIE PAR LLM                      | Europe, Afrique, Amérique, Asie, Je ne sais pas encore                                                   |
| engagement_intent    | ENRICHIE PAR LLM                      | Aide directe aux personnes, Transmission / pédagogie / accompagnement de public, Animation d'actions ou de collectif, Action terrain concrète (collecte, distribution, fabrication…), Secours / intervention, Engagement en cadre structuré, Organisation / gestion de projet / communication, Je ne sais pas encore |
| activite             | ENRICHIE PAR LLM                      | Aider et accompagner des personnes, Transmettre et animer, Fabriquer, réparer ou agir sur le terrain, Secourir et protéger, Organiser et coordonner, Créer et communiquer |
| equipe               | ENRICHIE PAR LLM                      | Plutôt en autonomie, Dans un petit groupe où l’on prend le temps de se connaître, Dans un grand collectif où il y a beaucoup de monde, Peu importe |
| interaction          | ENRICHIE PAR LLM                      | J’aime échanger et agir avec les autres, J’aime alterner les moments en groupe et en autonomie, Je préfère avancer principalement en autonomie, Peu importe |
| autonomie            | ENRICHIE PAR LLM                      | On me donne un objectif et je m’organise librement, J’aime être accompagné·e au début, puis gagner en autonomie, Je préfère avoir des consignes précises et un suivi régulier, Peu importe |
| imprevu              | ENRICHIE PAR LLM                      | J’aime quand il faut s’adapter rapidement, Un peu d’imprévu, ça me va, Je préfère savoir à quoi m’attendre, Je ne sais pas encore |
| formation_onisep     | ENRICHIE PAR LLM                      | Environnement, nature et sciences, Numérique et communication, Commerce, gestion, finance et services, Société, droit et politique, Éducation, culture et création, Social, santé et sport, Technique, industrie et construction, Sécurité, défense et logistique, Je ne sais pas encore |
| motivation_recherche | ENRICHIE PAR LLM                      | J'ai besoin d'une première expérience, J'aimerais rencontrer de nouvelles personnes, Je veux découvrir un métier, Je cherche une mission indemnisée, Je veux aider une cause qui me tient à cœur, Je veux avoir des horaires flexibles, Je veux contribuer à la sécurité de mon pays, Je veux pouvoir participer à distance, Je ne sais pas encore |
| statut               | DÉCLARATIVE/DÉRIVÉE                   | Je suis au lycée, Je fais des études, Je recherche un emploi, J’ai une activité professionnelle, Autre situation |
| handicap             | DÉCLARATIVE/DÉRIVÉE                   | Oui, Non, Je préfère ne pas répondre                                                                     |
| mobilite             | DÉCLARATIVE/DÉRIVÉE                   | À pied / en transports en commun, En vélo, En voiture                                                    |
| motivation           | DÉCLARATIVE/DÉRIVÉE                   | Me sentir utile, rencontrer de nouvelles personnes, Booster mon dossier Parcoursup, Tester une orientation, Servir le pays, Je ne sais pas encore, Booster mon CV, Découvrir un nouveau domaine, Avoir une 1ère expérience terrain, Partir à l'étranger, Utiliser mes compétences pour l'intérêt général, Reprendre confiance en moi, Garder / reprendre une activité, Enrichir mon CV, Préparer une reconversion professionnelle |
| parcoursup_formation | DÉCLARATIVE/DÉRIVÉE                   | Oui, Non                                                                                                 |
| servir_pays          | DÉCLARATIVE/DÉRIVÉE                   | Armée, Pompiers, Gendarmerie, Police, Je ne sais pas, Aucun                                              |
| location             | DÉCLARATIVE/DÉRIVÉE                   | Résolue par transformer                                                                                  |
| departmentCode       | DÉCLARATIVE/DÉRIVÉE                   | Résolue par transformer                                                                                  |
| tranche_age          | GATE D'ÉLIGIBILITÉ                    | Moins de 18 ans, 18-25 ans, 25-30 ans, 30-45 ans, 46-67 ans, 68-72 ans, 72 ans et plus, 46-66 ans (caché), Moins de 31 ans — situation de handicap (caché) |

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
