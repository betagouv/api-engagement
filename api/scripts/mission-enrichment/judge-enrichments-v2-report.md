# Rapport juge — prompt v2

**Juge :** gpt-4.1-mini  
**Missions évaluées :** 200 (0 erreurs)  
**Tokens :** 1,181,246 input / 106,769 output — coût estimé ~€0.60

## Vue d'ensemble

| Verdict | Missions | % |
|---------|----------|---|
| ✅ approved | 157 | 79% |
| ⚠️ flagged_minor | 19 | 10% |
| 🔴 flagged_major | 24 | 12% |

## Par taxonomy_key

| taxonomy_key | ok | questionable | wrong | manquantes |
|---|---|---|---|---|
| type_mission | 86% | 0% | 14% | 17 missions |
| engagement_intent | 93% | 5% | 2% | 6 missions |
| competence_rome | 90% | 6% | 4% | 3 missions |
| formation_onisep | 96% | 3% | 1% | 2 missions |
| domaine | 89% | 7% | 4% | 3 missions |
| secteur_activite | 93% | 4% | 3% | 5 missions |
| region_internationale | 95% | 0% | 5% | 0 missions |

## Patterns d'échec les plus fréquents

1. **"type_mission mal évalué"** — 21 missions
2. **"cadre_engage non justifié"** — 10 missions
3. **"competence_rome communication_creation_numerique non justifié"** — 7 missions
4. **"domaine trop large"** — 6 missions
5. **"domaine secondaire discutable"** — 5 missions
6. **"secteur_activite secondaire discutable"** — 4 missions
7. **"engagement_intent support_organisation discutable"** — 4 missions
8. **"domaine gestion_projet discutable"** — 4 missions
9. **"domaine mal attribué"** — 3 missions
10. **"engagement_intent mal interprété"** — 3 missions

## Missions flagged_major (top 10)

| missionId | patterns | résumé |
|---|---|---|
| f490c096-6419-4514-b05d-abaa0b24e07a | type_mission mal évalué, engagement_intent multiple sans hiérarchie claire, formation_onisep secondaire peu justifiée | La classification du domaine, secteur d'activité, et engagement principal (transmission, aide directe) est correcte et b |
| 5a3b4105-aee6-4612-9c4f-8992577306e5 | type_mission mal évalué, formation_onisep inadaptée, cadre_engage non justifié clairement | La classification du domaine, secteur d'activité, compétences et engagement en transmission est correcte et bien justifi |
| 73750d09-ba1d-404f-ab80-cbfae1829821 | type_mission mal évalué, cadre_engage incertain | La classification est globalement pertinente sur les domaines, secteur, compétences et intentions d'engagement. Cependan |
| 78fed800-a36d-4294-9200-7ec28d2dba72 | type_mission mal évalué, cadre_engage non justifié, domaine gestion_projet surévalué | La classification du domaine environnement_nature est correcte, ainsi que le secteur d'activité et les compétences liées |
| 3de7c9ac-603b-453f-bd87-cd59619e4a57 | domaine mal attribué, engagement_intent mal interprété, formation_onisep bien prise en compte | La classification du domaine 'gestion_projet' est incorrecte car la mission est centrée sur l'accompagnement direct des  |
| dcdb1a9d-e423-4898-b27e-0c3972e83c5f | domaine mal attribué, secteur_activite incorrect, engagement_intent mal interprété | La mission est une médiation numérique d'accompagnement direct des usagers dans leurs démarches administratives en ligne |
| 07c41c85-0fa5-48d6-941f-5b21957f71c2 | domaine mal attribué (social au lieu d'environnement), competence_rome inadaptée (social_soin pour animaux), formation_onisep inadaptée (social_sante_sport pour mission animale) | La mission porte principalement sur la protection animale, les soins aux animaux et la sensibilisation à la nature et à  |
| 0f8a9950-aac4-4381-9b17-5937d272f0c7 | competence_rome mal attribuée, type_mission mal évalué, cadre_engage non justifié | La classification du domaine, secteur d'activité, engagement transmission, animation et action terrain est correcte et b |
| c0b70603-ac03-4805-8959-a9760fdf7686 | domaine secondaire incorrectement ajouté, type_mission mal évalué (temps plein vs ponctuelle), cadre_engage discutable | La classification du domaine environnement_nature est correcte, mais l'ajout du domaine education_transmission est erron |
| 83de58bd-0d1c-41fd-a4fb-34ee2062bfc2 | domaine trop large, competence_rome mal attribuée, type_mission surestimé | La classification du domaine environnement_nature et education_transmission est correcte, ainsi que la reconnaissance de |
