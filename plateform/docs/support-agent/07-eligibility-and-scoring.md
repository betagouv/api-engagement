# Éligibilité et scoring des missions

## Modes de règle

Les règles déterministes produisent des valeurs taxonomiques avec un score de 1. Le mode `replace` remplace les valeurs enrichies de la taxonomie concernée. Lorsque plusieurs règles `replace` s'appliquent à une même taxonomie, leurs ensembles sont intersectés : la contrainte la moins permissive l'emporte. Le mode `add` complète les valeurs existantes sans les remplacer.

## Règles de dispositif et de type

- Une mission Service Civique reçoit les tranches moins de 18 ans, 18–25 ans et moins de 31 ans avec handicap, ainsi que `type_mission.temps_plein` et `dispositif.service_civique`.
- Une mission du publisher ROC reçoit les tranches moins de 18 ans, 18–25 ans, 25–30 ans, 30–45 ans, 46–67 ans et 68–72 ans.
- Une mission de type `benevolat` reçoit `dispositif.benevolat`.
- Une mission de volontariat sapeur-pompier reçoit `dispositif.sapeurs_pompiers` et les tranches moins de 18 ans, 18–25 ans, 25–30 ans, 30–45 ans et 46–66 ans.
- Une mission du publisher GENDARMERIE reçoit `dispositif.reserve_gendarmerie`.
- Une mission du publisher POLICE reçoit `dispositif.reserve_police_nationale`.

## Règles d'âge

Une mission avec `openToMinors=false` remplace `tranche_age` par les seules tranches adultes. Une mission avec `openToMinors=true` reçoit toutes les tranches définies. Ces ensembles sont intersectés avec les éventuelles contraintes propres au dispositif.

Une intersection vide ne produit aucune gate, ce qui est interprété par le matching comme une absence de contrainte. Le service journalise explicitement ce cas. Des invariants testés rendent ce cas inatteignable avec la configuration courante des règles d'âge.

## Règles additives

La présence d'un montant de compensation ajoute `motivation_recherche.indemnisation`. Une mission avec `remote=full` ajoute `motivation_recherche.remote`.

## Sources

- `api/src/services/mission-scoring/scoring-rules.ts`
- `api/src/services/mission-scoring/index.ts`
- `api/src/services/mission-scoring/__tests__/scoring-rules.test.ts`
- `api/src/services/matching-engine/config.ts`
- `packages/taxonomy/src/utils.ts`
