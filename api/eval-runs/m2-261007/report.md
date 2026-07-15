# Rapport evaluation matching

Parcours: 21/21 reussis (0 echecs techniques).
Version(s) algo: m2.
Echelle des notes: 1 = tres faible, 5 = excellent. Verdict/geo/format/coherence/homogeneite sont notes sur 5; une violation de gate force le verdict a 1.
Regle d'agregation: le verdict retenu par parcours est la moyenne des 2 runs juge, arrondie au demi-point. Si plus de 20% des parcours ont un ecart > 1 entre les 2 verdicts de run, le juge est considere instable.

## Metriques

| Metrique | Valeur | Usage |
|---|---:|---|
| Taux de parcours acceptables | 81.0% | Métrique de suivi campagne à campagne, verdict global >= 4. |
| Taux de violation d'eligibilite | 0.0% | Objectif 0%; 0/105 missions_ineligibles. |
| Score moyen par critere | Voir table criteres | Moyenne deterministe des 7 criteres sur les parcours reussis. |
| Repartition des causes | Voir table causes | Comptage matching / offre / signal sur les parcours < 4. |
| Indices d'eparpillement calcules | Voir table dispersion | Cohesion declaree + concentration calculees sur les tags, hors parcours sans signal. |
| Scores par segment | Voir tables segments | Moyennes par statut et urbain vs rural. |
| Distance moyenne top 5 | 0.73 km | avgDistanceKmTop5 retourne par le matching, a croiser avec le score geo. |
| Stabilite juge | OK (0.0% > 1 point) | 0/21 parcours compares. |

## Criteres

| Critere | Moyenne | Min | Ecart-type |
|---|---:|---:|---:|
| verdict | 4.12 | 3.00 | 0.55 |
| coherence | 3.76 | 1.00 | 1.06 |
| homogeneite | 3.71 | 3.00 | 0.42 |
| geo | 5.00 | 5.00 | 0.00 |
| format | 3.67 | 1.00 | 1.70 |
| cohesion_tags | 2.71 | 2.00 | 0.52 |
| concentration_tags | 5.00 | 5.00 | 0.00 |

## Causes des parcours < 4

| Cause | Parcours |
|---|---:|
| matching | 1 |
| offre | 1 |
| signal | 2 |
| indecis | 0 |

## Eparpillement

| Indice | Parcours | Moyenne | Min | Ecart-type |
|---|---:|---:|---:|---:|
| Cohesion declaree | 19 | 2.71 | 2.00 | 0.52 |
| Concentration | 19 | 5.00 | 5.00 | 0.00 |

## Segments

| Segment | Parcours | Verdict moyen | Taux acceptable |
|---|---:|---:|---:|
| lyceen | 10 | 4.05 | 80.0% |
| etudiant | 5 | 4.40 | 80.0% |
| demandeur_emploi | 4 | 3.88 | 75.0% |
| actif | 1 | 4.00 | 100.0% |
| autre | 1 | 4.50 | 100.0% |

| Territoire | Parcours | Verdict moyen | Taux acceptable |
|---|---:|---:|---:|
| urbain | 19 | 4.16 | 84.2% |
| rural | 2 | 3.75 | 50.0% |

## Recommandations automatiques

- Cause majoritaire des parcours faibles: signal (2 parcours).
- Segment le plus faible: demandeur_emploi avec un verdict moyen de 3.88.

## Parcours

### lea-parcoursup-ifsi

Profil: Léa, 17 ans, lycéenne en Terminale à Lyon, veut booster son dossier Parcoursup pour une formation en soins infirmiers, avec peu de temps hors week-ends
Version algo: m2
Echelle des notes: 1 = tres faible, 5 = excellent. Verdict/geo/format/coherence/homogeneite sont notes sur 5; une violation de gate force le verdict a 1.
Verdict: 3.50 | geo 5.00 | format 3.00 | coherence 3.00 | homogeneite 3.00
Distance moyenne top 5: 0.45 km
Notes: Texte libre Parcoursup non envoye: buildPayload ignore les answers text et le moteur consomme domaine=sante_soins.
missions_ineligibles: aucune

Scores moteur/Taxo/Geo et scores par taxonomie: echelle 0-1 (composantes du matching, a ne pas confondre avec les notes sur 5).

| Rang | Mission | Titre | Distance km | Score moteur | Taxo | Geo | domaine | tranche_age | type_mission |
|---:|---|---|---:|---:|---:|---:|---:|---:|---:|
| 1 | 17e9e021-9ffc-40a3-837e-e51fae27522c | 🦽 Viens aider les personnes en situation de handicap et leur famille! - LYON  | 0.85 | 0.64 | 0.32 | 0.97 | 1.00 | 0.90 | n/a |
| 2 | 9ed83a38-d521-4f4e-b650-37d81cd5f45e | Va à la rencontre de jeunes pour participer à la déstigmatisation de la santé mentale | 0.85 | 0.64 | 0.32 | 0.97 | 1.00 | 0.90 | n/a |
| 3 | c2ba4d2e-aef7-4b5d-af2b-a2f06e7fa3a0 | J'anime des ateliers de pratique artistique pour des personnes en situation d'isolement ou de fragilité | 0.07 | 0.58 | 0.17 | 1.00 | n/a | n/a | 1.00 |
| 4 | 6703bb3d73fbd982c1010100 | Je diffuse un guide d'engagement étudiant pour la transition écologique et solidaire : Campustopie | 0.23 | 0.58 | 0.17 | 0.99 | n/a | n/a | 1.00 |
| 5 | bcb3a58a-063c-42e7-909f-23419f6277b0 | J'aide à organiser et encadrer la Marche des Fiertés | 0.23 | 0.58 | 0.16 | 0.99 | n/a | n/a | 0.97 |

Justifications juge:
- Run 0: coherence 3, homogeneite 3. Parmi les 5 missions proposées, trois sont pertinentes pour Léa qui souhaite un engagement en lien avec la santé et les soins pour booster son dossier Parcoursup. La mission 2 porte directement sur la santé mentale, ce qui correspond bien au domaine santé_soins. La mission 3 concerne l'aide aux personnes en situation de handicap, ce qui est aussi dans le domaine de la santé et du social. La mission 4, bien que centrée sur la transition écologique, est une mission étudiante de diffusion d'un guide d'engagement, ce qui peut valoriser un dossier Parcoursup par l'engagement étudiant, même si ce n'est pas directement lié à la santé. Les missions 0 et 1 sont moins pertinentes car elles ne correspondent pas au domaine santé_soins ni à la motivation Parcoursup en soins infirmiers.
- Run 1: coherence 3, homogeneite 3. Parmi les 5 missions proposées, 3 sont pertinentes pour Léa qui souhaite un engagement en santé et soins pour booster son dossier Parcoursup. Les missions 2 et 3 sont directement liées à la santé mentale et au handicap, ce qui correspond bien à son projet en soins infirmiers. La mission 4, bien que centrée sur la Marche des Fiertés, peut être pertinente en termes d'engagement social et inclusion, ce qui est valorisé dans le domaine de la santé. Les missions 0 et 1 sont moins pertinentes car elles concernent l'écologie et l'animation artistique, sans lien direct avec la santé ou le soin.
### noah-parcoursup-sans-formation

Profil: Noah, 16 ans, lycéen à Aurillac, veut booster Parcoursup sans formation précise et reste ouvert sur le domaine
Version algo: m2
Echelle des notes: 1 = tres faible, 5 = excellent. Verdict/geo/format/coherence/homogeneite sont notes sur 5; une violation de gate force le verdict a 1.
Verdict: 4.00 | geo 5.00 | format 1.00 | coherence 5.00 | homogeneite 3.50
Distance moyenne top 5: 0.36 km
missions_ineligibles: aucune

Scores moteur/Taxo/Geo et scores par taxonomie: echelle 0-1 (composantes du matching, a ne pas confondre avec les notes sur 5).

| Rang | Mission | Titre | Distance km | Score moteur | Taxo | Geo | tranche_age | type_mission |
|---:|---|---|---:|---:|---:|---:|---:|---:|
| 1 | 20beebe2-d735-4a67-8605-e6b8f8b72237 | 🌍 Agis pour la nature et la biodiversité !  (AURILLAC) | 0.12 | 0.57 | 0.15 | 1.00 | 0.90 | n/a |
| 2 | 32aae998-a4a2-4a56-9dad-9f237ee7586d | 🎬Engage toi pour sensibiliser les jeunes sur des sujets de société ! (AURILLAC)  | 0.12 | 0.57 | 0.15 | 1.00 | 0.90 | n/a |
| 3 | c2b468e0-ea6e-4bef-8305-dd09b9157a81 | 👵Engage-toi pour lutter contre l’isolement des seniors - (AURILLAC)  | 0.12 | 0.57 | 0.15 | 1.00 | 0.90 | n/a |
| 4 | ec004e87-38df-4065-8553-fe41198ed553 | 🧠 Agis pour les questions de santé mentale : Brise les préjugés et informe les jeunes - (AURILLAC) | 0.12 | 0.57 | 0.15 | 1.00 | 0.90 | n/a |
| 5 | 64ac2eb15c26891bfc0f5395 | Je réalise des cours d'alphabétisation/français langue étrangère | 1.34 | 0.56 | 0.17 | 0.95 | n/a | 1.00 |

Justifications juge:
- Run 0: coherence 5, homogeneite 3. Toutes les missions proposées sont localisées à Aurillac et offrent un engagement régulier, ce qui correspond bien au profil de Noah, lycéen de 16 ans souhaitant booster son dossier Parcoursup sans domaine précis. Les missions couvrent des thématiques variées (cinéma et citoyenneté, environnement, seniors, alphabétisation, santé mentale) permettant à Noah de découvrir différents secteurs et d'acquérir des expériences valorisantes.
- Run 1: coherence 5, homogeneite 4. Toutes les missions proposées sont localisées à Aurillac et offrent un engagement régulier, ce qui correspond bien au profil de Noah, lycéen de 16 ans à Aurillac cherchant à booster son dossier Parcoursup sans préférence de domaine. Les missions couvrent des thématiques variées (santé mentale, alphabétisation, environnement, lien social avec seniors, sensibilisation par le cinéma) permettant à Noah d'acquérir des expériences diversifiées valorisables pour Parcoursup.
### sami-orientation-securite

Profil: Sami, 16 ans, lycéen en Seconde à Marseille, attiré par les métiers en uniforme et la sécurité, veut tester avant de choisir sa voie
Version algo: m2
Echelle des notes: 1 = tres faible, 5 = excellent. Verdict/geo/format/coherence/homogeneite sont notes sur 5; une violation de gate force le verdict a 1.
Verdict: 4.00 | geo 5.00 | format 5.00 | coherence 2.50 | homogeneite 3.50
Distance moyenne top 5: 1.25 km
missions_ineligibles: aucune

Scores moteur/Taxo/Geo et scores par taxonomie: echelle 0-1 (composantes du matching, a ne pas confondre avec les notes sur 5).

| Rang | Mission | Titre | Distance km | Score moteur | Taxo | Geo | formation_onisep | type_mission |
|---:|---|---|---:|---:|---:|---:|---:|---:|
| 1 | 6703bbb473fbd982c1012924 | J'intégre une association de sécurité civile | 4.17 | 0.63 | 0.39 | 0.87 | 0.97 | 0.97 |
| 2 | a7a31578-594e-49ac-83da-2fd8e4115119 | Je veux donner un coup de pouce à la mobilité professionnelle | distance | 0.59 | 0.20 | 0.98 | n/a | 1.00 |
| 3 | fd7dd9a3-9f26-4be5-a429-c767c834f993 | Bénévole Analyste | 0.50 | 0.59 | 0.20 | 0.98 | n/a | 1.00 |
| 4 | 65c40b69-bb96-4446-a3c1-5f29eca06fd8 | J'anime une équipe de bénévoles engagement des jeunes ! | 0.53 | 0.59 | 0.20 | 0.98 | n/a | 1.00 |
| 5 | cad5bf78-9753-4edb-b7a4-6e1111cf4621 | Je fais connaitre les droits de l’enfant ! | 0.53 | 0.59 | 0.20 | 0.98 | n/a | 1.00 |

Justifications juge:
- Run 0: coherence 2, homogeneite 4. Parmi les 5 missions proposées, seules les missions 0 et 1 sont en lien avec la sécurité, la formation et l'orientation vers des métiers en uniforme et sécurité. La mission 0 est très pertinente car elle propose une formation en secourisme et sécurité civile, ce qui correspond bien à l'intérêt de Sami. La mission 1, bien que plus orientée vers l'accompagnement social et la mobilité professionnelle, peut intéresser un jeune souhaitant tester une mission utile et régulière. Les autres missions (2, 3, 4) sont davantage centrées sur l'analyse, les droits de l'enfant et l'animation de bénévoles, ce qui ne correspond pas directement à l'orientation sécurité et uniforme recherchée.
- Run 1: coherence 3, homogeneite 3. Parmi les 5 missions proposées, 3 sont pertinentes pour Sami. La mission 3 (sécurité civile) correspond bien à son intérêt pour les métiers en uniforme et la sécurité. La mission 4 (analyste) est moins directement liée mais peut intéresser un lycéen curieux de comprendre les risques et la gestion, avec un aspect formation et rigueur. La mission 1 (mobilité professionnelle) est un engagement social utile, accessible à distance, qui peut convenir à un jeune motivé par l'aide aux autres. Les missions 0 et 2 sont centrées sur l'engagement des jeunes et la sensibilisation aux droits de l'enfant, moins en lien avec son profil orienté vers la sécurité et les métiers en uniforme.
### manon-utile-terrain

Profil: Manon, 16 ans, lycéenne à Lille, cherche une mission ponctuelle utile et concrète sur le terrain
Version algo: m2
Echelle des notes: 1 = tres faible, 5 = excellent. Verdict/geo/format/coherence/homogeneite sont notes sur 5; une violation de gate force le verdict a 1.
Verdict: 4.00 | geo 5.00 | format 1.00 | coherence 4.50 | homogeneite 3.50
Distance moyenne top 5: 1.06 km
missions_ineligibles: aucune

Scores moteur/Taxo/Geo et scores par taxonomie: echelle 0-1 (composantes du matching, a ne pas confondre avec les notes sur 5).

| Rang | Mission | Titre | Distance km | Score moteur | Taxo | Geo | engagement_intent | tranche_age |
|---:|---|---|---:|---:|---:|---:|---:|---:|
| 1 | 1672dd1d-243b-43c3-9f08-5b2790e64939 | Accompagner et informer les usagers dans les services du ministère de l'Intérieur - DII - asile | 0.37 | 0.67 | 0.36 | 0.99 | 0.90 | 0.90 |
| 2 | 6703bdb373fbd982c101a5dc | Créer du lien avec les personnes fragilisées - Ile de Solidarité | 1.07 | 0.67 | 0.38 | 0.96 | 0.98 | 0.90 |
| 3 | 68ba657512a258373e761a63 | Créer du lien entre les générations - PASS SENIORS  | 1.07 | 0.67 | 0.38 | 0.96 | 0.98 | 0.90 |
| 4 | f0f96fe0-3d76-4b6b-b45b-68a824e255e2 | Favoriser l’accès à la culture - TA1AMI | 1.07 | 0.66 | 0.36 | 0.96 | 0.90 | 0.90 |
| 5 | 6889a00368c461cb9e9154fd | LILLE 🧡 Participe à des activités en faveur de l'insertion sociale par l'habitat | 1.70 | 0.66 | 0.38 | 0.94 | 1.00 | 0.90 |

Justifications juge:
- Run 0: coherence 4, homogeneite 3. Les missions 2, 3, 4 et 1 proposent des actions concrètes sur le terrain, ponctuelles ou de durée limitée, avec un impact direct et utile, correspondant bien au profil de Manon qui cherche une mission ponctuelle, utile et concrète sur le terrain. La mission 0 est moins adaptée car elle semble plus longue (24-30h) et orientée vers un public senior, avec un engagement plus long et moins ponctuel.
- Run 1: coherence 5, homogeneite 4. Toutes les missions proposées sont en lien avec une action concrète sur le terrain, permettant un engagement direct et utile, ce qui correspond parfaitement à la demande de Manon, lycéenne de 16 ans cherchant une mission ponctuelle, utile et concrète sur le terrain.
### enzo-securite-ville-moyenne

Profil: Enzo, 17 ans, lycéen à Besançon, attiré par les métiers en uniforme et la sécurité, veut tester avant de choisir sa voie
Version algo: m2
Echelle des notes: 1 = tres faible, 5 = excellent. Verdict/geo/format/coherence/homogeneite sont notes sur 5; une violation de gate force le verdict a 1.
Verdict: 4.00 | geo 5.00 | format 3.00 | coherence 4.00 | homogeneite 4.00
Distance moyenne top 5: 0.53 km
Notes: Paire controlee avec sami-orientation-securite: meme profil, territoire ville moyenne au lieu de metropole (departage offre securite mineurs vs effet territoire).
missions_ineligibles: aucune

Scores moteur/Taxo/Geo et scores par taxonomie: echelle 0-1 (composantes du matching, a ne pas confondre avec les notes sur 5).

| Rang | Mission | Titre | Distance km | Score moteur | Taxo | Geo | formation_onisep | type_mission |
|---:|---|---|---:|---:|---:|---:|---:|---:|
| 1 | 462cb3b1-9615-47f3-80ed-13a045686ed5 | J'anime des actions d'éducation routière | 0.08 | 0.69 | 0.38 | 1.00 | 0.92 | 1.00 |
| 2 | f65f88ec-faf1-4ea5-9e93-8cc958e48fd0 | Je deviens acteur de la route | 2.34 | 0.65 | 0.38 | 0.92 | 0.92 | 0.97 |
| 3 | 17486908-3559-4972-a508-36338f77c4ae | J'anime des ateliers de prévention sur la route des vacances sur la Tournée d'été de l'association Prévention Routière | 0.08 | 0.60 | 0.20 | 1.00 | 1.00 | n/a |
| 4 | d914d1f8-b5fe-4974-95e8-e60bb1d94e41 | J'accompagne des personnes rencontrant des problématiques de mobilité dans leur recherche ou maintien dans l'emploi salarié | 0.08 | 0.60 | 0.20 | 1.00 | n/a | 1.00 |
| 5 | 767ed71c-0548-4dc9-8a09-12e2d42e7277 | J'anime des ateliers de prévention sur la route des vacances sur la Tournée d'été de l'association Prévention Routière | 0.08 | 0.60 | 0.19 | 1.00 | 0.97 | n/a |

Justifications juge:
- Run 0: coherence 4, homogeneite 4. Les missions 0, 2, 3 et 4 sont toutes liées à la sécurité routière et à la sensibilisation, ce qui correspond bien à l'intérêt d'Enzo pour les métiers en uniforme et la sécurité, ainsi que son souhait de tester avant de choisir sa voie. La mission 1, bien que localisée à Besançon, concerne l'accompagnement social et financier, moins en lien avec la sécurité ou les métiers en uniforme, donc moins pertinente.
- Run 1: coherence 4, homogeneite 4. Quatre missions (1, 2, 3, 4) sont clairement liées à la sécurité routière et à la sensibilisation, ce qui correspond bien à l'intérêt d'Enzo pour les métiers en uniforme et la sécurité, ainsi que son souhait de tester une orientation dans ce domaine. La mission 0, bien que localisée à Besançon, concerne l'accompagnement social et financier, sans lien direct avec la sécurité ou les métiers en uniforme, donc moins pertinente.
### jade-orientation-sante

Profil: Jade, 17 ans, lycéenne à Tours, veut tester une orientation dans le social, la santé ou le sport avant de choisir sa voie
Version algo: m2
Echelle des notes: 1 = tres faible, 5 = excellent. Verdict/geo/format/coherence/homogeneite sont notes sur 5; une violation de gate force le verdict a 1.
Verdict: 4.50 | geo 5.00 | format 2.00 | coherence 5.00 | homogeneite 4.00
Distance moyenne top 5: 0.93 km
Notes: Paire controlee avec sami-orientation-securite: meme branche tester_orientation sur un domaine a offre abondante (si la coherence remonte, le probleme de Sami est l'offre securite, pas la branche).
missions_ineligibles: aucune

Scores moteur/Taxo/Geo et scores par taxonomie: echelle 0-1 (composantes du matching, a ne pas confondre avec les notes sur 5).

| Rang | Mission | Titre | Distance km | Score moteur | Taxo | Geo | formation_onisep | tranche_age | type_mission |
|---:|---|---|---:|---:|---:|---:|---:|---:|---:|
| 1 | 00566ce5-5b0a-4d13-9a63-324d492b9090 | Je fais découvrir Tours à une famille en vacances | 0.22 | 0.69 | 0.39 | 0.99 | 0.97 | n/a | 0.97 |
| 2 | 39a5ae91-4686-4275-a493-fab4b0280148 | Accompagner des personnes migrantes, exilées, demandeurs d'asile en situation de précarité | 0.35 | 0.68 | 0.37 | 0.99 | 0.97 | 0.90 | n/a |
| 3 | 646d5c18-45b3-4482-b340-14990e7d0198 | Je deviens famille d'accueil pour des chats en attente d'adoption | 0.84 | 0.67 | 0.38 | 0.97 | 0.92 | n/a | 0.97 |
| 4 | 6d61010d-8dc3-4bf5-bfdd-4cee97182298 | Accompagner des personnes dépendantes à l’accès à la vie culturelle, sociale et citoyenne. | 1.51 | 0.66 | 0.37 | 0.95 | 0.97 | 0.90 | n/a |
| 5 | db5c05d5-9df3-415d-a600-1a417e16c1d8 | Participer aux actions du pôle Famille de Pluriel(le)s et à l'aide à la scolarité de la CSF-Sanitas | 1.75 | 0.66 | 0.37 | 0.94 | 0.97 | 0.90 | n/a |

Justifications juge:
- Run 0: coherence 5, homogeneite 4. Toutes les missions proposées correspondent bien aux domaines d'intérêt de Jade (social, santé, sport) et à sa volonté de tester une orientation dans ces secteurs. Les missions 0, 2, 3 et 4 sont clairement dans le social et santé, et la mission 0 inclut des activités physiques (balades à vélo) ce qui touche aussi au sport. La mission 1, bien que centrée sur la cause animale, peut être considérée comme moins directement liée mais reste une expérience d'engagement et de soin, ce qui peut intéresser une jeune en phase d'orientation sociale.
- Run 1: coherence 5, homogeneite 4. Toutes les missions proposées correspondent bien aux domaines d'intérêt de Jade (social, santé, sport) et à sa volonté de tester une orientation dans ces secteurs. Les missions 0, 2, 4 sont clairement dans le social et santé, la mission 3 est dans le social et animation, et la mission 1, bien que centrée sur la cause animale, peut être considérée comme une expérience sociale et de responsabilité, ce qui peut aussi intéresser Jade dans sa recherche d'orientation.
### ryan-utile-transmission

Profil: Ryan, 16 ans, lycéen à Saint-Denis, veut se sentir utile en transmettant et en accompagnant d'autres jeunes
Version algo: m2
Echelle des notes: 1 = tres faible, 5 = excellent. Verdict/geo/format/coherence/homogeneite sont notes sur 5; une violation de gate force le verdict a 1.
Verdict: 4.50 | geo 5.00 | format 4.00 | coherence 4.00 | homogeneite 4.00
Distance moyenne top 5: 0.88 km
Notes: Paire controlee avec manon-utile-terrain: meme motivation, intent transmission (offre mineurs a priori large: soutien scolaire) et territoire banlieue dense.
missions_ineligibles: aucune

Scores moteur/Taxo/Geo et scores par taxonomie: echelle 0-1 (composantes du matching, a ne pas confondre avec les notes sur 5).

| Rang | Mission | Titre | Distance km | Score moteur | Taxo | Geo | engagement_intent | tranche_age | type_mission |
|---:|---|---|---:|---:|---:|---:|---:|---:|---:|
| 1 | 8178a323-404c-46e1-bbbc-f011038751bf | J'accompagne les personnes exilées | 0.17 | 0.69 | 0.39 | 0.99 | 0.97 | n/a | 1.00 |
| 2 | 0040c106-3786-4225-8a9d-8f8d44402e56 | Je crée du lien en animant des conversations artistiques | 0.17 | 0.69 | 0.38 | 0.99 | 0.97 | n/a | 0.92 |
| 3 | 1756c910-041a-4cfe-ba45-bbffc388a398 | Je participe à l'animation d'un festival de littérature jeunesse | 1.22 | 0.68 | 0.40 | 0.96 | 1.00 | n/a | 1.00 |
| 4 | 0a7f5ba1-4bd5-4533-8d87-cdcc1abe3668 | Je transmets mes compétences en couture à des femmes du quartier | 1.56 | 0.67 | 0.40 | 0.95 | 1.00 | n/a | 1.00 |
| 5 | f9adfbac-481b-486b-9823-0cea559958ef | Soutien au développement d’une agriculture urbaine sociale et participative avec Engrainage | 1.28 | 0.67 | 0.38 | 0.96 | 1.00 | 0.90 | n/a |

Justifications juge:
- Run 0: coherence 4, homogeneite 4. Quatre missions sur cinq correspondent bien au profil de Ryan, qui souhaite transmettre et accompagner d'autres jeunes. La mission 1 (couture) implique transmission de compétences, la mission 3 (conversations artistiques) favorise le lien social et la transmission culturelle, la mission 4 (animation festival littérature jeunesse) est centrée sur la médiation et le partage avec des jeunes, et la mission 2 (accompagnement personnes exilées) implique un accompagnement humain et social. La mission 0, bien que à Saint-Denis, est plus axée sur l'agriculture urbaine et moins sur la transmission à des jeunes, donc moins pertinente.
- Run 1: coherence 4, homogeneite 4. Les missions 0, 1, 3 et 4 correspondent bien au profil de Ryan qui souhaite transmettre et accompagner d'autres jeunes, avec un engagement régulier à Saint-Denis. La mission 2, bien que intéressante, est plus axée sur l'agriculture urbaine et moins sur la transmission directe à des jeunes, donc moins pertinente.
### lina-utile-secours

Profil: Lina, 16 ans, lycéenne à Clermont-Ferrand, attirée par le secourisme et l'intervention, veut se sentir utile
Version algo: m2
Echelle des notes: 1 = tres faible, 5 = excellent. Verdict/geo/format/coherence/homogeneite sont notes sur 5; une violation de gate force le verdict a 1.
Verdict: 3.00 | geo 5.00 | format 5.00 | coherence 1.00 | homogeneite 3.00
Distance moyenne top 5: 0.38 km
Notes: Teste l'intent secours et le dispositif sapeurs_pompiers (accessible des 16 ans dans SCORING_RULES) pour un mineur.
missions_ineligibles: aucune

Scores moteur/Taxo/Geo et scores par taxonomie: echelle 0-1 (composantes du matching, a ne pas confondre avec les notes sur 5).

| Rang | Mission | Titre | Distance km | Score moteur | Taxo | Geo | type_mission |
|---:|---|---|---:|---:|---:|---:|---:|
| 1 | 17ad8ca7-cb61-46a6-a0c1-76867e064a1b | J'accompagne les micro-entrepreneurs dans leur développement commercial | 0.38 | 0.59 | 0.20 | 0.99 | 1.00 |
| 2 | 18c3df04-1335-4fe6-a327-19f885da4428 | J'accompagne des personnes rencontrant des problématiques de mobilité dans leur recherche ou maintien dans l'emploi salarié | 0.38 | 0.59 | 0.20 | 0.99 | 1.00 |
| 3 | 1a62b6da-a5f0-451b-9944-36b6ae7d319a | J'accompagne les micros entrepreneurs dans leur développement digital | 0.38 | 0.59 | 0.19 | 0.99 | 0.97 |
| 4 | 4e484d07-db00-4f47-85ad-c95255926c57 | J'aide à faire connaître l'ADIE | 0.38 | 0.59 | 0.19 | 0.99 | 0.97 |
| 5 | 0973f752-4756-4275-add0-db313f19ec51 | J'accompagne les micros entrepreneurs dans la création et le développement de leur projet | 0.38 | 0.59 | 0.18 | 0.99 | 0.92 |

Justifications juge:
- Run 0: coherence 1, homogeneite 1. Aucune des missions proposées ne correspond à l'intérêt de Lina pour le secourisme et l'intervention. Toutes les missions sont centrées sur l'accompagnement des micro-entrepreneurs ou la communication autour de l'ADIE, sans lien avec le secourisme.
- Run 1: coherence 1, homogeneite 5. Aucune des missions proposées ne correspond à l'intérêt de Lina pour le secourisme et l'intervention. Toutes les missions sont centrées sur l'accompagnement des micro-entrepreneurs ou la communication autour de l'ADIE, sans lien avec le secourisme.
### maxime-parcoursup-staps

Profil: Maxime, 17 ans, lycéen en Terminale à Nancy, veut booster son dossier Parcoursup pour une licence STAPS
Version algo: m2
Echelle des notes: 1 = tres faible, 5 = excellent. Verdict/geo/format/coherence/homogeneite sont notes sur 5; une violation de gate force le verdict a 1.
Verdict: 4.00 | geo 5.00 | format 1.00 | coherence 5.00 | homogeneite 4.50
Distance moyenne top 5: 2.48 km
Notes: Paire controlee avec lea-parcoursup-ifsi: meme branche parcoursup+formation sur un autre domaine (verifie si le 4.00 de Lea tient hors sante). Texte libre Parcoursup (STAPS) non envoye: comme pour Lea, le moteur consomme domaine=sport_animation.
missions_ineligibles: aucune

Scores moteur/Taxo/Geo et scores par taxonomie: echelle 0-1 (composantes du matching, a ne pas confondre avec les notes sur 5).

| Rang | Mission | Titre | Distance km | Score moteur | Taxo | Geo | domaine | tranche_age |
|---:|---|---|---:|---:|---:|---:|---:|---:|
| 1 | da3dcc50-ac79-4d20-b573-066e7430757d | AMBASSADEUR/DRICE DE LA PRATIQUE SPORTIVE POUR TOUS AU SEIN D'UNE ASSOCIATION SPORTIVE | 1.99 | 0.63 | 0.32 | 0.93 | 1.00 | 0.90 |
| 2 | 8c5bb55c-0b72-405b-a110-5d75cce6ad0e | AMBASSADEUR/DRICE DE LA CITOYENNETE PAR LE SPORT AU SEIN D'UNE ASSOCIATION SPORTIVE | 2.41 | 0.62 | 0.32 | 0.92 | 1.00 | 0.90 |
| 3 | 78ba7341-00d3-4a62-b779-dea6bc7d3323 | AMBASSADEUR/DRICE DE LA PRATIQUE SPORTIVE POUR TOUS AU SEIN D'UNE ASSOCIATION SPORTIVE | 3.55 | 0.60 | 0.32 | 0.88 | 1.00 | 0.90 |
| 4 | 5bf6575e-cc6f-4a92-a97e-56dd2182c5a4 | AMBASSADEUR/DRICE DE LA PRATIQUE SPORTIVE POUR TOUS AU SEIN D'UNE ASSOCIATION SPORTIVE | 4.04 | 0.59 | 0.32 | 0.87 | 1.00 | 0.90 |
| 5 | cafd6937-b310-4639-8cfc-e2cd1af08a70 | Sensibilisation aux droits de l'enfant | 0.43 | 0.57 | 0.15 | 0.99 | n/a | 0.90 |

Justifications juge:
- Run 0: coherence 5, homogeneite 4. Toutes les missions sauf la 3ème sont clairement liées au sport et à l'animation sportive, ce qui correspond parfaitement au souhait de Maxime de s'engager dans le domaine sport/animation pour booster son dossier Parcoursup en licence STAPS. La mission 3, bien que intéressante, porte sur les droits de l'enfant et n'est pas directement liée au sport, mais elle reste une mission de service civique valorisable. Globalement, toutes les missions sont pertinentes pour son profil.
- Run 1: coherence 5, homogeneite 5. Toutes les missions proposées sont en lien direct avec le sport, l'animation sportive, ou l'engagement citoyen par le sport, ce qui correspond parfaitement au profil de Maxime qui souhaite booster son dossier Parcoursup pour une licence STAPS et s'intéresse au domaine sport/animation.
### chloe-sans-signal

Profil: Chloé, 16 ans, lycéenne à Strasbourg, n'a pas encore de préférence claire et veut explorer les missions disponibles
Version algo: m2
Echelle des notes: 1 = tres faible, 5 = excellent. Verdict/geo/format/coherence/homogeneite sont notes sur 5; une violation de gate force le verdict a 1.
Verdict: 5.00 | geo 5.00 | format 5.00 | coherence 5.00 | homogeneite 4.00
Distance moyenne top 5: 0.22 km
Notes: Pendant lyceen de lucas-sans-signal: stress test sans signal avec le pool reduit par le filtre mineurs.
missions_ineligibles: aucune

Scores moteur/Taxo/Geo et scores par taxonomie: echelle 0-1 (composantes du matching, a ne pas confondre avec les notes sur 5).

| Rang | Mission | Titre | Distance km | Score moteur | Taxo | Geo | tranche_age |
|---:|---|---|---:|---:|---:|---:|---:|
| 1 | 63eaff51b262844ca60527e8 | Valoriser les activités Aqua-Glisse et sensibiliser les publics au sport et vivre-ensemble | 0.09 | 0.59 | 0.18 | 1.00 | 0.90 |
| 2 | 6703bb3d73fbd982c101063d | Valoriser les actions culturelles et artistiques  | 0.09 | 0.59 | 0.18 | 1.00 | 0.90 |
| 3 | 68f1c42af963b342955e6107 | Favoriser le vivre ensemble dès la petite enfance | 0.09 | 0.59 | 0.18 | 1.00 | 0.90 |
| 4 | 6925bb7867301f7654140045 | Agir pour les quartiers prioritaires : Info & Citoyenneté | 0.09 | 0.59 | 0.18 | 1.00 | 0.90 |
| 5 | a0836666-05ea-423f-9eef-e7cfc14402e8 | Sensibilisation aux droits de l'enfant | 0.70 | 0.58 | 0.18 | 0.98 | 0.90 |

Justifications juge:
- Run 0: coherence 5, homogeneite 4. Toutes les missions proposées sont adaptées à une jeune de 16 ans sans préférence claire, offrant une diversité d'engagements accessibles et intéressants pour un lycéen souhaitant explorer différents domaines à Strasbourg.
- Run 1: coherence 5, homogeneite 4. Toutes les missions proposées sont adaptées à une jeune de 16 ans sans préférence claire, offrant une diversité d'engagements accessibles et variés à Strasbourg, permettant une exploration large.
### emma-cv-communication

Profil: Emma, 20 ans, étudiante en L2 info-com à Paris, cherche à valoriser son CV avec des compétences en communication et numérique
Version algo: m2
Echelle des notes: 1 = tres faible, 5 = excellent. Verdict/geo/format/coherence/homogeneite sont notes sur 5; une violation de gate force le verdict a 1.
Verdict: 5.00 | geo 5.00 | format 5.00 | coherence 5.00 | homogeneite 4.00
Distance moyenne top 5: 0.20 km
missions_ineligibles: aucune

Scores moteur/Taxo/Geo et scores par taxonomie: echelle 0-1 (composantes du matching, a ne pas confondre avec les notes sur 5).

| Rang | Mission | Titre | Distance km | Score moteur | Taxo | Geo | competence_rome | tranche_age | type_mission |
|---:|---|---|---:|---:|---:|---:|---:|---:|---:|
| 1 | 6194e095a99ff4075b5ede44 | Ecrire des articles "culture, activités".. | 0.13 | 0.79 | 0.59 | 1.00 | 1.00 | 1.00 | 0.97 |
| 2 | 61f1186b51d4c407ac022d05 | Community manager pour une asso dans la culture | distance | 0.79 | 0.59 | 1.00 | 1.00 | 1.00 | 0.97 |
| 3 | 61f11cd951d4c407ac02314a | Ecrire des articles "culture, activités".. | distance | 0.79 | 0.59 | 1.00 | 1.00 | 1.00 | 0.97 |
| 4 | 674d936073fbd982c16aa0cc | Je gère la communication de l'association | distance | 0.79 | 0.59 | 0.99 | 1.00 | 1.00 | 0.97 |
| 5 | 61950bcb1206b80750daa196 | Administrateur d'un établissement scolaire privé | 0.40 | 0.79 | 0.60 | 0.99 | 1.00 | 1.00 | 1.00 |

Justifications juge:
- Run 0: coherence 5, homogeneite 4. Toutes les missions proposées correspondent bien au profil d'Emma, qui cherche à valoriser ses compétences en communication et numérique. Les missions 0, 1, 3 et 4 sont directement liées à la communication, rédaction, community management et création de contenu numérique, ce qui correspond parfaitement à ses attentes. La mission 2, bien que plus orientée gestion, inclut aussi des compétences numériques et de gestion de projet, ce qui peut aussi valoriser son CV.
- Run 1: coherence 5, homogeneite 4. Toutes les missions proposées correspondent bien au profil d'Emma, qui cherche à valoriser ses compétences en communication et numérique. Les missions 0, 1, 2, 3 sont directement liées à la communication digitale, rédaction, community management, création de contenu, ce qui correspond parfaitement à ses compétences et motivations. La mission 4, bien que plus orientée gestion, inclut aussi des compétences numériques et de gestion de projet, ce qui peut aussi valoriser son CV dans le domaine de la communication et numérique.
### hugo-terrain-temps-plein

Profil: Hugo, 22 ans, étudiant en césure à Nantes, veut une vraie première expérience terrain à temps plein, ouvert au service civique indemnisé
Version algo: m2
Echelle des notes: 1 = tres faible, 5 = excellent. Verdict/geo/format/coherence/homogeneite sont notes sur 5; une violation de gate force le verdict a 1.
Verdict: 5.00 | geo 5.00 | format 5.00 | coherence 5.00 | homogeneite 4.00
Distance moyenne top 5: 0.58 km
missions_ineligibles: aucune

Scores moteur/Taxo/Geo et scores par taxonomie: echelle 0-1 (composantes du matching, a ne pas confondre avec les notes sur 5).

| Rang | Mission | Titre | Distance km | Score moteur | Taxo | Geo | formation_onisep | tranche_age | type_mission |
|---:|---|---|---:|---:|---:|---:|---:|---:|---:|
| 1 | 6210af518831ec079cb6e33a | Nantes - Animer et Soutenir des colocations solidaires (6mois) | 0.12 | 0.79 | 0.59 | 1.00 | 0.97 | 1.00 | 1.00 |
| 2 | dbf92897-cfba-4771-813e-61dd61116c66 | Partager des activités avec des personnes en situation de handicap au sein d'un GEM | 0.68 | 0.79 | 0.60 | 0.98 | 1.00 | 1.00 | 1.00 |
| 3 | 6b9fae79-bfa7-4835-b364-8ad9c2b7895b | Partager des activités avec des personnes en situation de handicap au sein d'un GEM | 0.68 | 0.79 | 0.59 | 0.98 | 0.97 | 1.00 | 1.00 |
| 4 | 3c171da1-f46a-483f-b5fc-d77925740a09 | Valoriser les actions et la parole des personnes en situation de handicap intellectuel. | 0.72 | 0.78 | 0.59 | 0.98 | 0.97 | 1.00 | 1.00 |
| 5 | 61547353-a0d8-4661-86b7-de58dc76fa61 | Promouvoir la pratique sportive auprès de personnes en situation de handicap. | 0.72 | 0.78 | 0.59 | 0.98 | 0.97 | 1.00 | 1.00 |

Justifications juge:
- Run 0: coherence 5, homogeneite 4. Toutes les missions proposées sont en service civique à Nantes, à temps plein ou plus de 24h, ce qui correspond à la demande d'Hugo pour une expérience terrain à temps plein et un dispositif indemnisé. Les missions sont centrées sur l'accompagnement et l'animation auprès de personnes en situation de handicap ou en grande précarité, ce qui correspond à une expérience terrain sociale et humaine, en lien avec la formation sociale, santé, sport. Elles offrent une vraie immersion terrain et un engagement concret.
- Run 1: coherence 5, homogeneite 4. Toutes les missions proposées sont en service civique à Nantes, à temps plein ou plus de 30h, ce qui correspond parfaitement à la demande d'Hugo. Elles offrent une première expérience terrain concrète, notamment dans le domaine social et d'accompagnement, en lien avec sa formation et motivation.
### camille-environnement

Profil: Camille, 24 ans, étudiante à Grenoble, veut découvrir le domaine de l'environnement et de la nature
Version algo: m2
Echelle des notes: 1 = tres faible, 5 = excellent. Verdict/geo/format/coherence/homogeneite sont notes sur 5; une violation de gate force le verdict a 1.
Verdict: 4.50 | geo 5.00 | format 5.00 | coherence 3.50 | homogeneite 4.00
Distance moyenne top 5: 0.51 km
missions_ineligibles: aucune

Scores moteur/Taxo/Geo et scores par taxonomie: echelle 0-1 (composantes du matching, a ne pas confondre avec les notes sur 5).

| Rang | Mission | Titre | Distance km | Score moteur | Taxo | Geo | domaine | tranche_age | type_mission |
|---:|---|---|---:|---:|---:|---:|---:|---:|---:|
| 1 | 69453515f5bb8e756debcbe8 | Je suis bénévole à la recyclerie sportive | 0.43 | 0.79 | 0.60 | 0.99 | 1.00 | 1.00 | 1.00 |
| 2 | 26b747cb-64e7-473f-8e7f-3a8ca6355819 | J'aide à réparer des vélos et textiles de sport pour leur donner une seconde vie | 0.43 | 0.79 | 0.59 | 0.99 | 0.97 | 1.00 | 1.00 |
| 3 | 49f65db7-08d9-4d45-b0ba-d4636c4877d0 | J'aide au fonctionnement d'une ressourcerie solidaire spécialisée dans le sport | 0.43 | 0.79 | 0.59 | 0.99 | 0.97 | 1.00 | 1.00 |
| 4 | 74ef6230-d018-4c6c-9109-ab609c4e8a0d | Je donne une seconde vie solidaire à des ordinateurs, smartphones, tablettes, pour équiper les personnes éloignées du numérique | 0.60 | 0.79 | 0.59 | 0.98 | 0.97 | 1.00 | 1.00 |
| 5 | 68e7b5e6188c14db9da43c3c | Je pédale pour la solidarité ! | 0.63 | 0.79 | 0.59 | 0.98 | 0.97 | 1.00 | 1.00 |

Justifications juge:
- Run 0: coherence 3, homogeneite 4. Les missions 1, 2 et 3 sont liées à l'environnement, la nature, la solidarité locale et la durabilité, ce qui correspond à la motivation de Camille de découvrir le domaine de l'environnement et de la nature. La mission 0 est centrée sur le numérique et la mission 4 est très proche de la 2 mais redondante, donc moins pertinente.
- Run 1: coherence 4, homogeneite 4. Les missions 1, 2 et 4 sont clairement liées à l'environnement, la nature et l'économie circulaire via la ressourcerie sportive et la réparation d'objets, ce qui correspond bien à la motivation de Camille. La mission 3, bien que centrée sur le numérique, s'inscrit dans une démarche solidaire et de réemploi, ce qui peut intéresser quelqu'un souhaitant découvrir un domaine proche de l'environnement et de la solidarité. La mission 0 est moins directement liée à la nature ou à l'environnement, elle est plus axée sur la solidarité alimentaire et la logistique.
### ines-rural-aide-directe

Profil: Inès, 24 ans, étudiante en M1 à Figeac, veut se sentir utile et aider directement des personnes en zone rurale
Version algo: m2
Echelle des notes: 1 = tres faible, 5 = excellent. Verdict/geo/format/coherence/homogeneite sont notes sur 5; une violation de gate force le verdict a 1.
Verdict: 3.50 | geo 5.00 | format 1.00 | coherence 3.50 | homogeneite 4.00
Distance moyenne top 5: 0.45 km
missions_ineligibles: aucune

Scores moteur/Taxo/Geo et scores par taxonomie: echelle 0-1 (composantes du matching, a ne pas confondre avec les notes sur 5).

| Rang | Mission | Titre | Distance km | Score moteur | Taxo | Geo | engagement_intent | tranche_age |
|---:|---|---|---:|---:|---:|---:|---:|---:|
| 1 | 64092877f563558c4ff64b0e | Je participe à un accueil de jour à Figeac | 0.34 | 0.69 | 0.40 | 0.99 | 1.00 | 1.00 |
| 2 | 6703bca573fbd982c101392a | Accompagner les usagers dans les services des préfectures et sous-préfectures. | 0.06 | 0.69 | 0.38 | 1.00 | 0.92 | 1.00 |
| 3 | 6830b9d0d9770eb19bbeea58 | J'accompagne des personnes déficientes visuelles lors d’activités et de sorties dans le Lot | 0.62 | 0.69 | 0.40 | 0.98 | 1.00 | 1.00 |
| 4 | 6830b9e3d9770eb19bbf6742 | Je deviens chauffeur pour des personnes déficientes visuelles dans le Lot | 0.62 | 0.69 | 0.40 | 0.98 | 1.00 | 1.00 |
| 5 | 69285d8da20cd8f9e5cb42c0 | Je deviens famille d'accueil temporaire pour animaux | 0.62 | 0.69 | 0.40 | 0.98 | 1.00 | 1.00 |

Justifications juge:
- Run 0: coherence 3, homogeneite 4. Parmi les 5 missions proposées, 3 sont pertinentes pour Inès qui souhaite aider directement des personnes en zone rurale. Les missions 1 et 2 concernent l'accompagnement direct de personnes déficientes visuelles, ce qui correspond bien à son souhait d'aide directe. La mission 3 propose un accueil de jour pour des personnes en difficulté, ce qui est également un engagement direct auprès de personnes. Les missions 0 (accueil administratif) et 4 (famille d'accueil pour animaux) ne correspondent pas directement à son souhait d'aide humaine directe.
- Run 1: coherence 4, homogeneite 4. Les missions 0, 2, 3 et 5 (index 0,2,3,4) proposent un engagement direct auprès de personnes en zone rurale autour de Figeac, ce qui correspond bien au profil d'Inès qui souhaite aider directement des personnes en zone rurale. La mission 1 (famille d'accueil pour animaux) ne correspond pas à son souhait d'aide directe aux personnes. La mission 2 (chauffeur pour personnes déficientes visuelles) est moins proche car elle demande une disponibilité régulière et un engagement plus long, ce qui peut être moins adapté à une étudiante cherchant un engagement ponctuel.
### lucas-sans-signal

Profil: Lucas, 19 ans, étudiant à Toulouse, n'a pas encore de préférence claire et veut explorer les missions disponibles
Version algo: m2
Echelle des notes: 1 = tres faible, 5 = excellent. Verdict/geo/format/coherence/homogeneite sont notes sur 5; une violation de gate force le verdict a 1.
Verdict: 4.00 | geo 5.00 | format 5.00 | coherence 3.50 | homogeneite 3.00
Distance moyenne top 5: 0.02 km
missions_ineligibles: aucune

Scores moteur/Taxo/Geo et scores par taxonomie: echelle 0-1 (composantes du matching, a ne pas confondre avec les notes sur 5).

| Rang | Mission | Titre | Distance km | Score moteur | Taxo | Geo | tranche_age |
|---:|---|---|---:|---:|---:|---:|---:|
| 1 | 6537bff6557894a1b7b05331 | J'accompagne des porteurs de projets en précarité à créer leur activité en milieu rural | 0.02 | 0.60 | 0.20 | 1.00 | 1.00 |
| 2 | 661e52accd17d7c168601474 | Je sensibilise les jeunes au risque routier | 0.02 | 0.60 | 0.20 | 1.00 | 1.00 |
| 3 | 661e52accd17d7c168601476 | J'anime des actions d'éducation routière | 0.02 | 0.60 | 0.20 | 1.00 | 1.00 |
| 4 | 661e52accd17d7c168601477 | Je sensibilise les adultes au risque routier | 0.02 | 0.60 | 0.20 | 1.00 | 1.00 |
| 5 | 6900a5e5c5967b5e05e5531e | J'agis en Afrique sur la gestion et la valorisation des déchets | 0.02 | 0.60 | 0.20 | 1.00 | 1.00 |

Justifications juge:
- Run 0: coherence 4, homogeneite 3. Le profil de Lucas est un jeune étudiant sans préférence claire, souhaitant explorer les missions disponibles à Toulouse. Les missions 0, 3 et 4 sont liées à la sensibilisation au risque routier, adaptées à un jeune sans compétences spécifiques, avec un accompagnement prévu. La mission 1, accompagnement de porteurs de projets en précarité, est aussi pertinente car elle est locale et accessible, même si elle demande certaines compétences, la formation est assurée. La mission 2 est clairement non pertinente car elle s'adresse à des bénévoles retraités et demande une expertise spécifique, hors profil de Lucas.
- Run 1: coherence 3, homogeneite 3. Parmi les 5 missions proposées, trois sont pertinentes pour Lucas qui souhaite explorer sans préférence claire : les missions 0, 1 et 2 sont centrées sur la sensibilisation et l'éducation routière, adaptées à un jeune étudiant à Toulouse. La mission 4, bien que plus spécifique, reste accessible et intéressante pour un étudiant souhaitant découvrir le secteur social et l'accompagnement de porteurs de projets. La mission 3 est clairement exclue car elle s'adresse uniquement à des bénévoles retraités et demande une expertise spécifique.
### karim-reconversion

Profil: Karim, 28 ans, demandeur d'emploi à Saint-Étienne, en reconversion, veut tester un nouveau secteur avant de se former
Version algo: m2
Echelle des notes: 1 = tres faible, 5 = excellent. Verdict/geo/format/coherence/homogeneite sont notes sur 5; une violation de gate force le verdict a 1.
Verdict: 3.00 | geo 5.00 | format 1.00 | coherence 3.00 | homogeneite 3.00
Distance moyenne top 5: 1.31 km
missions_ineligibles: aucune

Scores moteur/Taxo/Geo et scores par taxonomie: echelle 0-1 (composantes du matching, a ne pas confondre avec les notes sur 5).

| Rang | Mission | Titre | Distance km | Score moteur | Taxo | Geo | formation_onisep | tranche_age | type_mission |
|---:|---|---|---:|---:|---:|---:|---:|---:|---:|
| 1 | 619518541206b80750dabb18 | Missions humanitaires de formation au Laos | 1.22 | 0.64 | 0.33 | 0.96 | n/a | 1.00 | 0.97 |
| 2 | 6703bbb473fbd982c1012641 | Je deviens répar'acteur dans un repair café | 4.85 | 0.59 | 0.33 | 0.85 | 0.97 | 1.00 | n/a |
| 3 | 623bf0abafe67c079c1ff8bd | Accompagnez une personne souffrant de solitude | 0.17 | 0.58 | 0.17 | 0.99 | n/a | 1.00 | n/a |
| 4 | 68dea572620a2c8312f0f88b | Ateliers du mardi soir et du mercredi après-midi | 0.17 | 0.58 | 0.17 | 0.99 | n/a | 1.00 | n/a |
| 5 | 62d0a662c4b896071489b475 | Intervenants Français Langues Etrangères (FLE) | 0.17 | 0.58 | 0.17 | 0.99 | n/a | 1.00 | n/a |

Justifications juge:
- Run 0: coherence 3, homogeneite 3. Parmi les 5 missions proposées, trois sont pertinentes pour Karim qui souhaite tester un nouveau secteur avant de se former, notamment dans des domaines techniques ou d'accompagnement social. La mission 2 (repair café) correspond bien à un secteur technique et manuel, en lien avec la reconversion technique. La mission 3 (accompagnement de personnes isolées) et la mission 4 (enseignement du français langue étrangère) offrent des expériences dans le social, ce qui peut aussi être un secteur de reconversion. Les missions 0 (humanitaire médical) et 1 (archéologie) sont moins en lien avec ses objectifs et son profil.
- Run 1: coherence 3, homogeneite 3. Parmi les 5 missions proposées, trois sont pertinentes pour Karim qui souhaite tester un nouveau secteur avant de se former dans le domaine technique ou industriel. La mission 1 (archéologie) offre une expérience technique et scientifique, la mission 3 (accompagnement de personnes isolées) permet de développer des compétences relationnelles utiles dans tout secteur, et la mission 4 (enseignement du français langue étrangère) propose une formation et une activité structurée. Les missions 0 (repair café) et 2 (missions humanitaires au Laos) sont moins adaptées : la première demande des compétences en bricolage spécifiques et un engagement ponctuel, la seconde est une mission longue et spécialisée hors de la zone locale.
### julie-handicap-confiance

Profil: Julie, 26 ans, demandeuse d'emploi à Montpellier, en situation de handicap, veut reprendre confiance
Version algo: m2
Echelle des notes: 1 = tres faible, 5 = excellent. Verdict/geo/format/coherence/homogeneite sont notes sur 5; une violation de gate force le verdict a 1.
Verdict: 4.50 | geo 5.00 | format 5.00 | coherence 4.50 | homogeneite 4.00
Distance moyenne top 5: 0.50 km
missions_ineligibles: aucune

Scores moteur/Taxo/Geo et scores par taxonomie: echelle 0-1 (composantes du matching, a ne pas confondre avec les notes sur 5).

| Rang | Mission | Titre | Distance km | Score moteur | Taxo | Geo | engagement_intent | tranche_age | type_mission |
|---:|---|---|---:|---:|---:|---:|---:|---:|---:|
| 1 | 684900ea506e3d4138297446 | J’anime des activités collectives pour rompre l’isolement | 0.50 | 0.73 | 0.48 | 0.98 | 1.00 | 0.90 | 1.00 |
| 2 | 3f1b3149-7a70-446b-8e8c-64269582f7f2 | Je participe au lancement d’une antenne bénévole pour plus de lien social dans ma ville | 0.50 | 0.73 | 0.48 | 0.98 | 0.98 | 0.90 | 1.00 |
| 3 | 6703bbb473fbd982c1012710 | Je soutiens les personnes sans domicile fixe | 0.50 | 0.73 | 0.48 | 0.98 | 0.98 | 0.90 | 1.00 |
| 4 | 683738ef69714958a856d7bb | J'aide les élèves à aimer apprendre au collège et à l'école (intervention en classe) | 0.50 | 0.73 | 0.48 | 0.98 | 0.98 | 0.90 | 1.00 |
| 5 | 682b2dfb7802d118af5faec4 | Je deviens éducateur bénévole en école pour Project Rescue Ocean | 0.50 | 0.73 | 0.48 | 0.98 | 0.97 | 0.90 | 1.00 |

Justifications juge:
- Run 0: coherence 5, homogeneite 4. Toutes les missions proposées correspondent bien au profil de Julie, qui souhaite un engagement régulier à Montpellier, avec un intérêt pour l'animation et l'aide directe, et un objectif de reprendre confiance. Les missions 1, 3 et 4 sont très centrées sur le lien social, l'animation et l'accompagnement direct, ce qui correspond parfaitement à ses motivations. La mission 2, bien que plus orientée vers la sensibilisation environnementale, implique de l'animation auprès de jeunes, ce qui reste pertinent. La mission 0 (numérotée 0 dans la liste) est aussi cohérente, mais elle est moins directement liée à l'aide directe et plus à l'intervention en classe, ce qui peut être un peu moins adapté, mais reste pertinent. Donc on considère les 5 premières missions comme pertinentes.
- Run 1: coherence 4, homogeneite 4. Les missions 1, 2, 3 et 4 correspondent bien au profil de Julie qui souhaite un engagement régulier à Montpellier, avec un focus sur l'animation et l'aide directe, et qui cherche à reprendre confiance. La mission 0 est moins clairement adaptée car elle demande créativité et animation en binôme, mais reste pertinente. Cependant, la mission 0 est moins prioritaire que les autres pour ce profil, donc on retient 4 missions pertinentes.
### nadia-reprendre-activite

Profil: Nadia, 24 ans, demandeuse d'emploi à Rouen, veut reprendre une activité dans le bâtiment, l'industrie ou la logistique
Version algo: m2
Echelle des notes: 1 = tres faible, 5 = excellent. Verdict/geo/format/coherence/homogeneite sont notes sur 5; une violation de gate force le verdict a 1.
Verdict: 4.00 | geo 5.00 | format 5.00 | coherence 3.00 | homogeneite 4.00
Distance moyenne top 5: 1.88 km
missions_ineligibles: aucune

Scores moteur/Taxo/Geo et scores par taxonomie: echelle 0-1 (composantes du matching, a ne pas confondre avec les notes sur 5).

| Rang | Mission | Titre | Distance km | Score moteur | Taxo | Geo | secteur_activite | tranche_age | type_mission |
|---:|---|---|---:|---:|---:|---:|---:|---:|---:|
| 1 | 6194def9a99ff4075b5edc34 | Logistique et transport de matériel événements | 1.66 | 0.77 | 0.60 | 0.94 | 1.00 | 1.00 | 1.00 |
| 2 | 62b0b752d559470714fc2c5a | Je deviens réparateur au sein d'un Repair Café | 2.85 | 0.75 | 0.58 | 0.91 | 0.92 | 1.00 | 1.00 |
| 3 | 2b9f3964-c3d7-46b3-a6e1-f94d3c5793fe | J'aide un garage solidaire à faciliter l'insertion par la mobilité | 4.79 | 0.71 | 0.58 | 0.85 | 0.92 | 1.00 | 0.97 |
| 4 | 65bcd2a3465156f505e9b0d6 | J'accompagne la transition écologique des entrepreneurs | 0.05 | 0.70 | 0.40 | 1.00 | n/a | 1.00 | 1.00 |
| 5 | 68bead10f7b3b996db36ca7e | Je veux encadrer des jeunes filles dans une séance de Football | 0.05 | 0.70 | 0.40 | 1.00 | n/a | 1.00 | 1.00 |

Justifications juge:
- Run 0: coherence 3, homogeneite 4. Parmi les 5 missions proposées, 3 sont pertinentes pour Nadia qui souhaite reprendre une activité dans le bâtiment, l'industrie ou la logistique. La mission 1 (garage solidaire) est liée à la mécanique et à l'insertion par la mobilité, ce qui correspond au secteur industrie/logistique. La mission 2 (réparateur Repair Café) implique des compétences en mécanique et réparation, ce qui est proche du secteur industrie. La mission 3 (logistique et transport de matériel) correspond clairement au secteur logistique. Les missions 0 (transition écologique) et 4 (encadrement football) ne correspondent pas à ses secteurs d'intérêt.
- Run 1: coherence 3, homogeneite 4. Parmi les 5 missions proposées, trois sont pertinentes pour Nadia qui souhaite reprendre une activité dans le bâtiment, l'industrie ou la logistique. La mission 2 (réparateur au Repair Café) correspond à des compétences techniques et de réparation, proche du bâtiment et de l'industrie. La mission 4 (logistique et transport de matériel) correspond à la logistique, un des secteurs souhaités. La mission 0 (garage solidaire) pourrait être partiellement pertinente mais elle est plus orientée vers la mobilité et l'insertion sociale que vers une activité technique régulière. Les missions 1 (transition écologique) et 3 (encadrement football) ne correspondent pas au profil professionnel recherché.
### mehdi-cv-multi-duree

Profil: Mehdi, 29 ans, demandeur d'emploi à Bordeaux, veut enrichir son CV avec plusieurs formats possibles
Version algo: m2
Echelle des notes: 1 = tres faible, 5 = excellent. Verdict/geo/format/coherence/homogeneite sont notes sur 5; une violation de gate force le verdict a 1.
Verdict: 4.00 | geo 5.00 | format 5.00 | coherence 3.00 | homogeneite 4.00
Distance moyenne top 5: 0.19 km
Notes: Le parcours multi-duree est accepte par l'API mais potentiellement non atteignable dans l'UI actuelle si l'ecran duree reste mono-selection.
missions_ineligibles: aucune

Scores moteur/Taxo/Geo et scores par taxonomie: echelle 0-1 (composantes du matching, a ne pas confondre avec les notes sur 5).

| Rang | Mission | Titre | Distance km | Score moteur | Taxo | Geo | competence_rome | tranche_age | type_mission |
|---:|---|---|---:|---:|---:|---:|---:|---:|---:|
| 1 | 67eac016530c8d21cd55d9b1 | Collecte et distribution | 0.00 | 0.73 | 0.47 | 1.00 | 0.92 | 1.00 | 0.90 |
| 2 | 6194d3dba99ff4075b5eceaa | Accompagnement personnes difficultés financières | 0.03 | 0.73 | 0.47 | 1.00 | 0.92 | 1.00 | 0.89 |
| 3 | 6194d169a99ff4075b5ecbd8 | Représentant/e de Ville sur Bordeaux | 0.03 | 0.73 | 0.46 | 1.00 | 0.92 | 1.00 | 0.86 |
| 4 | 6703bad073fbd982c100ebad | Je m'engage en tant qu'assistant.e administratif.ve bénévole pour une association culturelle | 0.65 | 0.73 | 0.48 | 0.98 | 1.00 | 1.00 | 0.90 |
| 5 | 61c5475ace285307902a46c6 | Je gère l'animation d'une antenne locale | 0.26 | 0.73 | 0.47 | 0.99 | 0.92 | 1.00 | 0.89 |

Justifications juge:
- Run 0: coherence 2, homogeneite 4. Parmi les 5 missions proposées, seules deux semblent pertinentes pour Mehdi qui souhaite enrichir son CV avec des missions régulières à temps plein et en lien avec ses compétences en gestion et pilotage juridique. La mission 1 (Accompagnement personnes difficultés financières) implique un suivi et une formation, ce qui peut enrichir un CV. La mission 4 (animation d'une antenne locale) correspond à une gestion d'équipe et suivi, proche de ses compétences. Les autres missions sont plus ponctuelles, culturelles ou associatives sans lien clair avec ses compétences ou objectifs.
- Run 1: coherence 4, homogeneite 4. Parmi les 5 missions proposées, 4 sont pertinentes pour Mehdi qui souhaite enrichir son CV avec des missions régulières à temps plein, en lien avec ses compétences en gestion et pilotage juridique. La mission 2 (accompagnement personnes en difficultés financières) correspond bien à ses compétences et motivation. La mission 3 (animation d'une antenne locale) implique des responsabilités de gestion et coordination, ce qui est pertinent. La mission 4 (assistant administratif bénévole) est directement liée à la gestion administrative, très cohérente avec son profil. La mission 1 (collecte et distribution) est moins directement liée mais reste une activité régulière et valorisable. La mission 0 (représentant de ville) est moins ciblée sur ses compétences et motivation, donc moins pertinente.
### thomas-actif-competences

Profil: Thomas, 29 ans, salarié à Rennes, veut mettre ses compétences pro en gestion et management au service de l'intérêt général sur des missions ponctuelles
Version algo: m2
Echelle des notes: 1 = tres faible, 5 = excellent. Verdict/geo/format/coherence/homogeneite sont notes sur 5; une violation de gate force le verdict a 1.
Verdict: 4.00 | geo 5.00 | format 5.00 | coherence 2.50 | homogeneite 3.50
Distance moyenne top 5: 0.61 km
missions_ineligibles: aucune

Scores moteur/Taxo/Geo et scores par taxonomie: echelle 0-1 (composantes du matching, a ne pas confondre avec les notes sur 5).

| Rang | Mission | Titre | Distance km | Score moteur | Taxo | Geo | competence_rome | tranche_age | type_mission |
|---:|---|---|---:|---:|---:|---:|---:|---:|---:|
| 1 | 6194dd25a99ff4075b5ed9ec | Evenement culturel | 0.39 | 0.73 | 0.48 | 0.99 | 0.86 | 1.00 | 1.00 |
| 2 | 609b4a8ce5444207489ac84d | Je témoigne de mon métier et de mon parcours | 0.39 | 0.73 | 0.47 | 0.99 | 0.84 | 1.00 | 1.00 |
| 3 | 68da5c617cee915183abeca5 | je plante des arbres pour les générations futures | 0.62 | 0.73 | 0.48 | 0.98 | 0.86 | 1.00 | 1.00 |
| 4 | 395edc05-d17e-4c4b-9ca5-6e264f134dbd | J'aide à organiser les départs et arrivées des jeunes en échanges internationaux | 0.83 | 0.72 | 0.48 | 0.97 | 0.86 | 1.00 | 1.00 |
| 5 | cbf4df0d-9a4f-475d-a87b-d3115384eb33 | Je participe puis anime un atelier de la Fresque Océane pour sensibiliser à la protection des océans | 0.83 | 0.72 | 0.48 | 0.97 | 0.86 | 1.00 | 1.00 |

Justifications juge:
- Run 0: coherence 3, homogeneite 3. Parmi les 5 missions proposées, 3 correspondent bien au profil de Thomas qui souhaite utiliser ses compétences en gestion, management et coopération dans des missions ponctuelles d'intérêt général. La mission 2 (témoignage métier) correspond à un engagement ponctuel valorisant ses compétences professionnelles. La mission 3 (animation atelier Fresque Océane) implique des compétences d'animation et gestion de groupe, en lien avec ses compétences soft skills. La mission 4 (organisation échanges internationaux) correspond à une mission de gestion et coordination. Les missions 0 et 1 sont plus orientées vers des actions manuelles ou événementielles sans lien direct avec ses compétences professionnelles.
- Run 1: coherence 2, homogeneite 4. Parmi les 5 missions proposées, seules deux semblent pertinentes pour Thomas qui souhaite utiliser ses compétences en gestion et management pour des missions ponctuelles à Rennes. La mission 1 (témoignage de métier) peut valoriser ses compétences professionnelles et est ponctuelle. La mission 4 (animation d'atelier Fresque Océane) implique une formation et animation, ce qui peut mobiliser ses compétences en gestion et animation de groupe. Les autres missions sont plutôt orientées vers des actions manuelles, événementielles ou logistiques sans lien direct avec ses compétences professionnelles.
### clara-cesure-humanitaire

Profil: Clara, 25 ans, en césure à Paris, cherche une mission humanitaire ou solidaire à temps plein
Version algo: m2
Echelle des notes: 1 = tres faible, 5 = excellent. Verdict/geo/format/coherence/homogeneite sont notes sur 5; une violation de gate force le verdict a 1.
Verdict: 4.50 | geo 5.00 | format 5.00 | coherence 3.50 | homogeneite 3.50
Distance moyenne top 5: 0.50 km
missions_ineligibles: aucune

Scores moteur/Taxo/Geo et scores par taxonomie: echelle 0-1 (composantes du matching, a ne pas confondre avec les notes sur 5).

| Rang | Mission | Titre | Distance km | Score moteur | Taxo | Geo | domaine | tranche_age | type_mission |
|---:|---|---|---:|---:|---:|---:|---:|---:|---:|
| 1 | a135853f-2eb7-40da-ae05-652262311d64 | Soutien aux animations socio-éducatives, citoyennes et européennes des MIJE | 0.55 | 0.79 | 0.59 | 0.98 | 0.94 | 1.00 | 1.00 |
| 2 | 6194dd02a99ff4075b5ed9cc | Animation d'ateliers numériques | 0.40 | 0.78 | 0.58 | 0.99 | 0.89 | 1.00 | 1.00 |
| 3 | cd896723-adf8-4f65-8b27-9bda4a5bfff3 | Intervenir dans les établissements scolaire pour favoriser la réussite des élèves - PARIS | 0.47 | 0.78 | 0.58 | 0.98 | 0.89 | 1.00 | 1.00 |
| 4 | 74c67973-59f4-4393-90bd-56cba1984bac | Animation d'un Café Social destinés aux seniors survivants de la Shoah.  | 0.56 | 0.78 | 0.58 | 0.98 | 0.90 | 1.00 | 1.00 |
| 5 | 9d150c5e-7d33-4f6e-b63b-a26095a976d2 | Créer du lien en auberge grâce à la musique et aux animations conviviales | 0.55 | 0.78 | 0.58 | 0.98 | 0.89 | 1.00 | 1.00 |

Justifications juge:
- Run 0: coherence 3, homogeneite 3. Parmi les 5 missions proposées, trois sont clairement en lien avec le domaine social et solidaire, notamment l'accompagnement des seniors, l'animation d'ateliers numériques pour personnes en difficulté, et le soutien aux animations socio-éducatives et citoyennes. Ces missions correspondent bien à la recherche d'une mission humanitaire ou solidaire à temps plein à Paris. Les deux autres missions (0 et 1) sont plus orientées vers l'éducation scolaire et l'animation culturelle en auberge, moins directement liées au domaine humanitaire ou social ciblé.
- Run 1: coherence 4, homogeneite 4. Quatre missions (1, 2, 3, 4) correspondent bien au profil de Clara qui cherche une mission humanitaire ou solidaire à temps plein à Paris. Elles impliquent un engagement social, solidaire, interculturel ou d'accompagnement, ce qui correspond à ses motivations et domaines d'intérêt. La mission 0 est moins pertinente car elle est plus éducative scolaire et moins clairement humanitaire ou solidaire international/social.
