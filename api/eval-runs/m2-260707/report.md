# Rapport evaluation matching

Parcours: 15/15 reussis (0 echecs techniques).
Version(s) algo: m2.
Echelle des notes: 1 = tres faible, 5 = excellent. Verdict/geo/format/coherence/homogeneite sont notes sur 5; une violation de gate force le verdict a 1.
Regle d'agregation: le verdict retenu par parcours est la moyenne des 2 runs juge, arrondie au demi-point. Si plus de 20% des parcours ont un ecart > 1 entre les 2 verdicts de run, le juge est considere instable.

## Metriques

| Metrique | Valeur | Usage |
|---|---:|---|
| Taux de parcours acceptables | 60.0% | Métrique de suivi campagne à campagne, verdict global >= 4. |
| Taux de violation d'eligibilite | 0.0% | Objectif 0%; 0/75 missions_ineligibles. |
| Score moyen par critere | Voir table criteres | Moyenne deterministe des 7 criteres sur les parcours reussis. |
| Repartition des causes | Voir table causes | Comptage matching / offre / signal sur les parcours < 4. |
| Indices d'eparpillement calcules | Voir table dispersion | Cohesion declaree + concentration calculees sur les tags, hors parcours sans signal. |
| Scores par segment | Voir tables segments | Moyennes par statut et urbain vs rural. |
| Distance moyenne top 5 | 0.66 km | avgDistanceKmTop5 retourne par le matching, a croiser avec le score geo. |
| Stabilite juge | OK (0.0% > 1 point) | 0/15 parcours compares. |

## Criteres

| Critere | Moyenne | Min | Ecart-type |
|---|---:|---:|---:|
| verdict | 4.07 | 3.00 | 0.63 |
| coherence | 3.53 | 2.00 | 0.97 |
| homogeneite | 3.67 | 3.00 | 0.35 |
| geo | 5.00 | 5.00 | 0.00 |
| format | 3.93 | 1.00 | 1.48 |
| cohesion_tags | 2.57 | 2.00 | 0.49 |
| concentration_tags | 4.86 | 4.00 | 0.35 |

## Causes des parcours < 4

| Cause | Parcours |
|---|---:|
| matching | 0 |
| offre | 3 |
| signal | 1 |
| indecis | 0 |

## Eparpillement

| Indice | Parcours | Moyenne | Min | Ecart-type |
|---|---:|---:|---:|---:|
| Cohesion declaree | 14 | 2.57 | 2.00 | 0.49 |
| Concentration | 14 | 4.86 | 4.00 | 0.35 |

## Segments

| Segment | Parcours | Verdict moyen | Taux acceptable |
|---|---:|---:|---:|
| lyceen | 4 | 3.63 | 25.0% |
| etudiant | 5 | 4.60 | 80.0% |
| demandeur_emploi | 4 | 3.88 | 75.0% |
| actif | 1 | 3.50 | 0.0% |
| autre | 1 | 4.50 | 100.0% |

| Territoire | Parcours | Verdict moyen | Taux acceptable |
|---|---:|---:|---:|
| urbain | 13 | 4.15 | 69.2% |
| rural | 2 | 3.50 | 0.0% |

## Recommandations automatiques

- Cause majoritaire des parcours faibles: offre (3 parcours).
- Segment le plus faible: actif avec un verdict moyen de 3.50.

## Parcours

### lea-parcoursup-ifsi

Profil: Léa, 17 ans, lycéenne en Terminale à Lyon, veut booster son dossier Parcoursup pour une formation en soins infirmiers, avec peu de temps hors week-ends
Version algo: m2
Echelle des notes: 1 = tres faible, 5 = excellent. Verdict/geo/format/coherence/homogeneite sont notes sur 5; une violation de gate force le verdict a 1.
Verdict: 4.00 | geo 5.00 | format 3.00 | coherence 3.50 | homogeneite 4.00
Distance moyenne top 5: 1.04 km
Notes: Texte libre Parcoursup non envoye: buildPayload ignore les answers text et le moteur consomme domaine=sante_soins.
missions_ineligibles: aucune

| Rang | Mission | Titre | Distance km | Score moteur |
|---:|---|---|---:|---:|
| 1 | 63e6896d82588c89f28e6fb6 | J'apporte mon aide au niveau des demandes en santé | 0.23 | 0.66 |
| 2 | 2f74466e-d01e-4d45-83f4-de2eac48f859 | Favoriser l’accueil des demandeurs d’asile dans les actions de MéDA – Médecine et Droit d’Asile | 1.39 | 0.63 |
| 3 | e24f9765-057b-4ecd-8134-e6251287da67 | Accompagner et sensibiliser aux facteurs de risque de cancers. | 3.28 | 0.60 |
| 4 | c2ba4d2e-aef7-4b5d-af2b-a2f06e7fa3a0 | J'anime des ateliers de pratique artistique pour des personnes en situation d'isolement ou de fragilité | 0.07 | 0.58 |
| 5 | 44773f88-9bf3-48e0-93a5-30800be1186f | J'apporte mon aide ponctuelle pour transporter du mobilier | 0.23 | 0.58 |

Justifications juge:
- Run 0: coherence 3, homogeneite 4. Les missions 1, 2 et 3 sont clairement liées au domaine de la santé et aux soins, ce qui correspond à la motivation de Léa pour une formation en soins infirmiers. La mission 1 concerne l'accueil des demandeurs d'asile dans un contexte médical, la mission 2 est directement liée à l'aide dans les démarches et rendez-vous médicaux, et la mission 3 porte sur la sensibilisation à la santé et la prévention. Les missions 0 et 4 ne sont pas pertinentes car elles ne concernent pas le domaine de la santé ni ne contribuent directement à un dossier Parcoursup en soins infirmiers.
- Run 1: coherence 4, homogeneite 4. Parmi les 5 missions, 4 sont pertinentes pour Léa qui souhaite un engagement en santé et soins, avec un impact positif sur son dossier Parcoursup. La mission 4 (aide aux demandes en santé) est très directement liée, la mission 1 (accueil des demandeurs d'asile en médecine) aussi, la mission 0 (sensibilisation aux facteurs de risque de cancers) est liée au domaine santé mais demande un engagement hebdomadaire important incompatible avec ses disponibilités, donc moins adaptée. La mission 2 (ateliers artistiques) est moins liée au domaine santé mais peut valoriser des compétences transversales. La mission 3 (aide au transport de mobilier) n'est pas liée au domaine santé ni à Parcoursup.
### noah-parcoursup-sans-formation

Profil: Noah, 16 ans, lycéen à Aurillac, veut booster Parcoursup sans formation précise et reste ouvert sur le domaine
Version algo: m2
Echelle des notes: 1 = tres faible, 5 = excellent. Verdict/geo/format/coherence/homogeneite sont notes sur 5; une violation de gate force le verdict a 1.
Verdict: 3.50 | geo 5.00 | format 2.00 | coherence 3.50 | homogeneite 3.50
Distance moyenne top 5: 0.80 km
missions_ineligibles: aucune

| Rang | Mission | Titre | Distance km | Score moteur |
|---:|---|---|---:|---:|
| 1 | 61f027b7a0706f079c6b7cd0 | Contribuer à lutter contre l'isolement des personnes en situation de handicap. | 1.69 | 0.63 |
| 2 | 08c05709-e619-4d51-b9e0-ace023dcc15c | Accompagner les publics dans leur parcours de formation  | 1.96 | 0.63 |
| 3 | 20beebe2-d735-4a67-8605-e6b8f8b72237 | 🌍 Agis pour la nature et la biodiversité !  (AURILLAC) | 0.12 | 0.57 |
| 4 | 32aae998-a4a2-4a56-9dad-9f237ee7586d | 🎬Engage toi pour sensibiliser les jeunes sur des sujets de société ! (AURILLAC)  | 0.12 | 0.57 |
| 5 | c2b468e0-ea6e-4bef-8305-dd09b9157a81 | 👵Engage-toi pour lutter contre l’isolement des seniors - (AURILLAC)  | 0.12 | 0.57 |

Justifications juge:
- Run 0: coherence 3, homogeneite 4. Parmi les 5 missions proposées, 3 sont pertinentes pour Noah qui est lycéen à Aurillac cherchant à booster son dossier Parcoursup sans domaine précis. La mission 1 (sensibilisation par le cinéma) est adaptée à un jeune lycéen et développe des compétences utiles. La mission 2 (accompagnement dans les parcours de formation) est directement liée à l'orientation et formation, ce qui correspond bien à son besoin de booster Parcoursup. La mission 3 (lutte contre l'isolement des personnes handicapées) est aussi pertinente car elle propose un engagement social accessible et valorisant. Les missions 0 (environnement) et 4 (isolement des seniors) sont moins directement liées à son profil et motivation, bien qu intéressantes, elles sont moins ciblées sur son objectif Parcoursup.
- Run 1: coherence 4, homogeneite 3. Quatre missions sur cinq sont pertinentes pour un lycéen de 16 ans souhaitant booster son dossier Parcoursup sans domaine précis. La mission 4 (accompagnement dans le parcours de formation) est directement liée à l'objectif Parcoursup. Les missions 2 et 3 (lutte contre l'isolement des seniors et des personnes handicapées) offrent un engagement social valorisant. La mission 1 (environnement et biodiversité) est aussi pertinente pour un engagement citoyen. La mission 0, bien que intéressante, est plus spécifique à la sensibilisation par le cinéma et moins directement liée à un profil ouvert sans domaine précis.
### sami-orientation-securite

Profil: Sami, 16 ans, lycéen en Seconde à Marseille, attiré par les métiers en uniforme et la sécurité, veut tester avant de choisir sa voie
Version algo: m2
Echelle des notes: 1 = tres faible, 5 = excellent. Verdict/geo/format/coherence/homogeneite sont notes sur 5; une violation de gate force le verdict a 1.
Verdict: 3.50 | geo 5.00 | format 5.00 | coherence 2.00 | homogeneite 4.00
Distance moyenne top 5: 0.44 km
missions_ineligibles: aucune

| Rang | Mission | Titre | Distance km | Score moteur |
|---:|---|---|---:|---:|
| 1 | 0eb706b9-4e56-43dd-9971-8d9aac4165c1 | Je deviens sapeur-pompier volontaire près de chez moi | 0.83 | 0.77 |
| 2 | 19f30754-cda0-4a9a-9a01-c43a6828b20f |  Participer à l'égalité des chances dans les collèges prioritaires marseillais  | 0.33 | 0.68 |
| 3 | 7b63445b-dfce-4b22-a06f-ccd10e87785a |  Participer à l'égalité des chances dans les collèges prioritaires marseillais  | 0.33 | 0.68 |
| 4 | 0830a4c5-1e8d-4ff3-980b-529963f511fb | Appui à la mission ESEN (Education et Sensibilisation à l'Environnement et à la Nature) | 0.39 | 0.68 |
| 5 | 7c62a8af-0fe1-4356-8e47-65610e4e71e5 | Animer un tiers-lieu dédié à la création de lien social (MARSEILLE) | 0.33 | 0.68 |

Justifications juge:
- Run 0: coherence 2, homogeneite 4. Parmi les 5 missions proposées, seules les missions 1 et 2 concernent l'orientation scolaire et l'accompagnement des jeunes dans leur parcours, ce qui correspond partiellement à la motivation de Sami de tester une orientation. La mission 0, bien que liée à la sécurité et aux métiers en uniforme, est tronquée et ne permet pas de confirmer sa pertinence complète, mais semble très adaptée. Les missions 3 et 4 sont éloignées des intérêts de Sami (création de lien social, environnement). Cependant, faute d'informations complètes sur la mission 0, elle n'est pas comptée comme pleinement pertinente ici.
- Run 1: coherence 2, homogeneite 4. Parmi les 5 missions proposées, seules la mission 3 (sapeur-pompier volontaire) correspond clairement à l'intérêt de Sami pour les métiers en uniforme et la sécurité, lui permettant de tester cette orientation. La mission 4, bien que moins directement liée, peut offrir une expérience d'engagement social et animation, ce qui peut intéresser un jeune lycéen en phase de découverte. Les autres missions sont centrées sur l'animation dans les collèges ou la sensibilisation environnementale, qui ne correspondent pas à son profil et motivation.
### manon-utile-terrain

Profil: Manon, 16 ans, lycéenne à Lille, cherche une mission ponctuelle utile et concrète sur le terrain
Version algo: m2
Echelle des notes: 1 = tres faible, 5 = excellent. Verdict/geo/format/coherence/homogeneite sont notes sur 5; une violation de gate force le verdict a 1.
Verdict: 3.50 | geo 5.00 | format 4.00 | coherence 2.50 | homogeneite 3.50
Distance moyenne top 5: 0.67 km
missions_ineligibles: aucune

| Rang | Mission | Titre | Distance km | Score moteur |
|---:|---|---|---:|---:|
| 1 | 6226eb86285e0d07a0699c90 | Je m'engage en tant que mécanicien au sein d'un atelier de réparation de vélos | 0.53 | 0.68 |
| 2 | 616a5cc97dd83e074d7409a3 | Je suis psychiatre : je témoigne de mon métier auprès des jeunes et des adultes en reconversion | 0.66 | 0.68 |
| 3 | 1bbc82a3-ae08-4ef2-933f-1abda19eb4c6 | J'accompagne des personnes en situation de handicap lors d'un séjour à Amiens | 1.20 | 0.68 |
| 4 | ec9b2056-6a4d-4331-ae80-bfb6f494989b | Sensibiliser aux comportements éco-responsables (VRAC) | 0.36 | 0.68 |
| 5 | 656682cf7faba68de3d6b95d | J'assure un parrainage de Proximité, pour aider un enfant à grandir | 0.61 | 0.68 |

Justifications juge:
- Run 0: coherence 3, homogeneite 4. Parmi les 5 missions proposées, 3 correspondent bien au profil de Manon, une lycéenne de 16 ans cherchant une mission ponctuelle, utile et concrète sur le terrain avec aide directe et action terrain à Lille. La mission 1 (accompagnement de personnes en situation de handicap lors d'un séjour) est ponctuelle (2 jours) et sur le terrain, avec aide directe. La mission 3 (mécanicien vélo) est une mission concrète sur le terrain, ponctuelle (une demi-journée), utile et engageante. La mission 4 (parrainage de proximité) est aussi une action de terrain, utile et concrète, avec engagement flexible et ponctuel. Les missions 0 (témoignage métier) et 2 (sensibilisation éco-responsable) ne correspondent pas bien : la 0 est plutôt un témoignage à distance, pas d'action terrain directe, et la 2 est un engagement long (24h/semaine) et moins ponctuel.
- Run 1: coherence 2, homogeneite 3. Parmi les 5 missions proposées, seules les missions 1 (parrainage d'enfant) et 2 (accompagnement de personnes handicapées lors d'un séjour) correspondent bien au profil de Manon, qui cherche une mission ponctuelle, utile et concrète sur le terrain avec aide directe. La mission 1 est une action de terrain avec un engagement direct auprès d'un enfant, et la mission 2 est une sortie concrète sur 2 jours avec accompagnement direct. Les autres missions sont soit trop longues, trop théoriques, ou ne correspondent pas à une action ponctuelle sur le terrain.
### emma-cv-communication

Profil: Emma, 20 ans, étudiante en L2 info-com à Paris, cherche à valoriser son CV avec des compétences en communication et numérique
Version algo: m2
Echelle des notes: 1 = tres faible, 5 = excellent. Verdict/geo/format/coherence/homogeneite sont notes sur 5; une violation de gate force le verdict a 1.
Verdict: 5.00 | geo 5.00 | format 5.00 | coherence 5.00 | homogeneite 4.00
Distance moyenne top 5: 0.20 km
missions_ineligibles: aucune

| Rang | Mission | Titre | Distance km | Score moteur |
|---:|---|---|---:|---:|
| 1 | 6194e095a99ff4075b5ede44 | Ecrire des articles "culture, activités".. | 0.13 | 0.79 |
| 2 | 61f1186b51d4c407ac022d05 | Community manager pour une asso dans la culture | distance | 0.79 |
| 3 | 61f11cd951d4c407ac02314a | Ecrire des articles "culture, activités".. | distance | 0.79 |
| 4 | 674d936073fbd982c16aa0cc | Je gère la communication de l'association | distance | 0.79 |
| 5 | 61950bcb1206b80750daa196 | Administrateur d'un établissement scolaire privé | 0.40 | 0.79 |

Justifications juge:
- Run 0: coherence 5, homogeneite 4. Toutes les missions proposées correspondent bien au profil d'Emma, qui cherche à valoriser ses compétences en communication et numérique. Les missions 0, 1, 2 et 3 sont directement liées à la communication, rédaction, community management, et création de contenu numérique, ce qui correspond parfaitement à ses attentes. La mission 4, bien que plus orientée gestion, inclut aussi des compétences numériques et de gestion de projet, ce qui peut aussi valoriser son CV dans le domaine numérique et communication.
- Run 1: coherence 5, homogeneite 4. Toutes les missions proposées correspondent bien au profil d'Emma, qui cherche à valoriser ses compétences en communication et numérique. Les missions 0, 1, 2 et 4 sont directement liées à la communication, rédaction, gestion de contenu numérique, ce qui correspond parfaitement à ses attentes. La mission 3, bien que plus orientée gestion, inclut des compétences numériques et de gestion de projet qui peuvent aussi valoriser son CV dans le domaine de la communication et numérique.
### hugo-terrain-temps-plein

Profil: Hugo, 22 ans, étudiant en césure à Nantes, veut une vraie première expérience terrain à temps plein, ouvert au service civique indemnisé
Version algo: m2
Echelle des notes: 1 = tres faible, 5 = excellent. Verdict/geo/format/coherence/homogeneite sont notes sur 5; une violation de gate force le verdict a 1.
Verdict: 5.00 | geo 5.00 | format 5.00 | coherence 5.00 | homogeneite 4.00
Distance moyenne top 5: 0.58 km
missions_ineligibles: aucune

| Rang | Mission | Titre | Distance km | Score moteur |
|---:|---|---|---:|---:|
| 1 | 6210af518831ec079cb6e33a | Nantes - Animer et Soutenir des colocations solidaires (6mois) | 0.12 | 0.79 |
| 2 | dbf92897-cfba-4771-813e-61dd61116c66 | Partager des activités avec des personnes en situation de handicap au sein d'un GEM | 0.68 | 0.79 |
| 3 | 6b9fae79-bfa7-4835-b364-8ad9c2b7895b | Partager des activités avec des personnes en situation de handicap au sein d'un GEM | 0.68 | 0.79 |
| 4 | 3c171da1-f46a-483f-b5fc-d77925740a09 | Valoriser les actions et la parole des personnes en situation de handicap intellectuel. | 0.72 | 0.78 |
| 5 | 61547353-a0d8-4661-86b7-de58dc76fa61 | Promouvoir la pratique sportive auprès de personnes en situation de handicap. | 0.72 | 0.78 |

Justifications juge:
- Run 0: coherence 5, homogeneite 4. Toutes les missions proposées sont en service civique à Nantes, à temps plein ou plus de 30h, ce qui correspond à la demande d'Hugo pour une expérience terrain à temps plein et un service civique indemnisé. Les missions concernent l'accompagnement et l'animation auprès de personnes en situation de handicap ou en difficulté sociale, ce qui est cohérent avec sa formation en social, santé, sport et sa motivation pour une expérience terrain.
- Run 1: coherence 5, homogeneite 4. Toutes les missions proposées sont en service civique à Nantes, à temps plein ou plus de 24h par semaine, ce qui correspond à la demande d'Hugo pour une expérience terrain à temps plein. Elles concernent des actions sociales et d'accompagnement, notamment auprès de personnes en situation de handicap ou en difficulté sociale, ce qui est cohérent avec sa formation en social, santé, sport et sa motivation pour une expérience terrain.
### camille-environnement

Profil: Camille, 24 ans, étudiante à Grenoble, veut découvrir le domaine de l'environnement et de la nature
Version algo: m2
Echelle des notes: 1 = tres faible, 5 = excellent. Verdict/geo/format/coherence/homogeneite sont notes sur 5; une violation de gate force le verdict a 1.
Verdict: 4.50 | geo 5.00 | format 5.00 | coherence 4.00 | homogeneite 4.00
Distance moyenne top 5: 0.66 km
missions_ineligibles: aucune

| Rang | Mission | Titre | Distance km | Score moteur |
|---:|---|---|---:|---:|
| 1 | 69453515f5bb8e756debcbe8 | Je suis bénévole à la recyclerie sportive | 0.43 | 0.79 |
| 2 | 74ef6230-d018-4c6c-9109-ab609c4e8a0d | Je donne une seconde vie solidaire à des ordinateurs, smartphones, tablettes, pour équiper les personnes éloignées du numérique | 0.60 | 0.79 |
| 3 | 68e7b5e6188c14db9da43c3c | Je pédale pour la solidarité ! | 0.63 | 0.79 |
| 4 | 660cda455bb0982e86ec124a | Pratiques sportives comme vecteur d'intégration dans l'agglomération grenobloise | 0.76 | 0.78 |
| 5 | 65ca2582357e3a12cd907acd | Animation, activités nature et en collectif | 0.89 | 0.78 |

Justifications juge:
- Run 0: coherence 4, homogeneite 4. Quatre missions sur cinq correspondent bien au profil de Camille qui souhaite découvrir le domaine de l'environnement et de la nature : la mission 1 propose des animations nature et vie en communauté, la mission 2 est liée à la recyclerie sportive avec réparation et tri, la mission 3 concerne le reconditionnement d'appareils électroniques pour inclusion numérique (environnement social et solidaire), et la mission 4 propose des activités sportives en nature avec sensibilisation à la préservation de l'environnement. La mission 0, bien que liée à une agriculture locale durable, est plus centrée sur la solidarité alimentaire et la logistique, moins directement sur la découverte de l'environnement et de la nature.
- Run 1: coherence 4, homogeneite 4. Quatre missions (1, 2, 3, 4) sont clairement en lien avec l'environnement, la nature ou le développement durable, ce qui correspond au souhait de Camille de découvrir ce domaine. La mission 0, bien que mentionnant la nature, est davantage axée sur l'inclusion sociale et culturelle, moins directement liée à la découverte du domaine environnemental.
### ines-rural-aide-directe

Profil: Inès, 24 ans, étudiante en M1 à Figeac, veut se sentir utile et aider directement des personnes en zone rurale
Version algo: m2
Echelle des notes: 1 = tres faible, 5 = excellent. Verdict/geo/format/coherence/homogeneite sont notes sur 5; une violation de gate force le verdict a 1.
Verdict: 3.50 | geo 5.00 | format 1.00 | coherence 4.00 | homogeneite 3.50
Distance moyenne top 5: 2.54 km
missions_ineligibles: aucune

| Rang | Mission | Titre | Distance km | Score moteur |
|---:|---|---|---:|---:|
| 1 | 6703bca573fbd982c101392a | Accompagner les usagers dans les services des préfectures et sous-préfectures. | 0.06 | 0.69 |
| 2 | da230246-c5f9-4eed-86cd-a05856bbb9cf | 🚀 Développe des projets et aide les collégiens dans leur scolarité à Capdenac | 5.26 | 0.61 |
| 3 | 6836d4b803f5b53e97cde7f5 | Promouvoir et accompagner la participation active des élèves au sein de l’école de Saint-Felix  | 6.53 | 0.60 |
| 4 | 64092877f563558c4ff64b0e | Je participe à un accueil de jour à Figeac | 0.34 | 0.59 |
| 5 | 0541fc57-1359-487f-a3f7-7274286a7072 | Culture: accueil, médiation et communication au service des publics médiathèques | 0.49 | 0.59 |

Justifications juge:
- Run 0: coherence 4, homogeneite 4. Les missions 1, 2 et 4 correspondent bien à l'envie d'Inès d'aider directement des personnes, notamment en milieu rural proche de Figeac, avec un contact humain direct. La mission 0 est plus administrative et moins centrée sur l'aide directe, la mission 3 est culturelle et moins en lien avec l'aide directe aux personnes en zone rurale. La mission 5 (numérotée 4 ici) est très pertinente car elle propose un accueil de jour avec contact direct et aide sociale.
- Run 1: coherence 4, homogeneite 3. Les missions 3 et 4 proposent un engagement direct auprès de personnes en milieu rural ou semi-rural, ce qui correspond bien au souhait d'Inès d'aider directement des personnes en zone rurale. La mission 1, bien que culturelle, se situe à Figeac et implique un contact avec le public, ce qui peut aussi répondre au besoin d'utilité directe. La mission 2, bien qu'administrative, implique un accompagnement direct des usagers, ce qui peut aussi être pertinent. La mission 0 est moins pertinente car elle concerne l'animation d'enfants dans une école à Saint-Félix, ce qui est un peu éloigné et plus orienté vers l'animation que l'aide directe.
### lucas-sans-signal

Profil: Lucas, 19 ans, étudiant à Toulouse, n'a pas encore de préférence claire et veut explorer les missions disponibles
Version algo: m2
Echelle des notes: 1 = tres faible, 5 = excellent. Verdict/geo/format/coherence/homogeneite sont notes sur 5; une violation de gate force le verdict a 1.
Verdict: 5.00 | geo 5.00 | format 5.00 | coherence 5.00 | homogeneite 3.00
Distance moyenne top 5: 0.07 km
missions_ineligibles: aucune

| Rang | Mission | Titre | Distance km | Score moteur |
|---:|---|---|---:|---:|
| 1 | 6537bff6557894a1b7b05331 | J'accompagne des porteurs de projets en précarité à créer leur activité en milieu rural | 0.02 | 0.60 |
| 2 | 6900a5e5c5967b5e05e5531e | J'agis en Afrique sur la gestion et la valorisation des déchets | 0.02 | 0.60 |
| 3 | 63fc9c771b1e29d98663ff24 | Je modélise un système économique post-croissance | 0.03 | 0.60 |
| 4 | 689b3edb0289c68c013fda77 | Je contribue à des projets à impact positifs locaux et internationaux | 0.14 | 0.60 |
| 5 | 68c2a2fbc08da2ec50a06b68 | Je rejoins une équipe proche de chez moi pour participer à la lutte contre la Faim ! | 0.16 | 0.60 |

Justifications juge:
- Run 0: coherence 5, homogeneite 3. Toutes les missions proposées sont localisées à Toulouse et accessibles à un jeune de 19 ans sans préférence claire, offrant une diversité d'engagements possibles, ce qui correspond bien au profil d'un étudiant souhaitant explorer différentes missions.
- Run 1: coherence 5, homogeneite 3. Toutes les missions proposées sont localisées à Toulouse et accessibles à un jeune étudiant sans préférence claire, offrant une diversité d'engagements possibles. Elles couvrent des domaines variés mais restent adaptés à un profil exploratoire comme celui de Lucas.
### karim-reconversion

Profil: Karim, 28 ans, demandeur d'emploi à Saint-Étienne, en reconversion, veut tester un nouveau secteur avant de se former
Version algo: m2
Echelle des notes: 1 = tres faible, 5 = excellent. Verdict/geo/format/coherence/homogeneite sont notes sur 5; une violation de gate force le verdict a 1.
Verdict: 3.00 | geo 5.00 | format 1.00 | coherence 2.50 | homogeneite 4.00
Distance moyenne top 5: 0.38 km
missions_ineligibles: aucune

| Rang | Mission | Titre | Distance km | Score moteur |
|---:|---|---|---:|---:|
| 1 | 619518541206b80750dabb18 | Missions humanitaires de formation au Laos | 1.22 | 0.64 |
| 2 | 623bf0abafe67c079c1ff8bd | Accompagnez une personne souffrant de solitude | 0.17 | 0.58 |
| 3 | 68dea572620a2c8312f0f88b | Ateliers du mardi soir et du mercredi après-midi | 0.17 | 0.58 |
| 4 | 62d0a662c4b896071489b475 | Intervenants Français Langues Etrangères (FLE) | 0.17 | 0.58 |
| 5 | 662417decd17d7c1686d57b5 | J'aide des adultes à obtenir ou réviser le code de la route | 0.17 | 0.58 |

Justifications juge:
- Run 0: coherence 2, homogeneite 4. Parmi les 5 missions proposées, seules les missions 2 (aide à la préparation du code de la route) et 3 (intervention en Français Langues Étrangères) peuvent être considérées comme pertinentes pour Karim, qui souhaite tester un nouveau secteur avant de se former, notamment dans un domaine technique ou industriel. Ces missions impliquent un engagement à temps plein et une formation, ce qui correspond à sa volonté de préparation à une reconversion. Les autres missions sont plus orientées vers le social, la culture ou l'humanitaire, sans lien direct avec sa motivation et son projet de formation technique.
- Run 1: coherence 3, homogeneite 4. Parmi les 5 missions proposées, trois sont pertinentes pour Karim qui souhaite tester un nouveau secteur avant une formation technique ou industrielle. Les missions 1 (enseignement du français), 2 (accompagnement social) et 3 (aide à la préparation du code de la route) sont des activités d'engagement social et éducatif accessibles et utiles pour une reconversion. Les missions 0 (mission humanitaire médicale au Laos) et 4 (atelier archéologique) sont moins en lien avec son projet de reconversion technique ou industrielle.
### julie-handicap-confiance

Profil: Julie, 26 ans, demandeuse d'emploi à Montpellier, en situation de handicap, veut reprendre confiance
Version algo: m2
Echelle des notes: 1 = tres faible, 5 = excellent. Verdict/geo/format/coherence/homogeneite sont notes sur 5; une violation de gate force le verdict a 1.
Verdict: 4.50 | geo 5.00 | format 5.00 | coherence 4.00 | homogeneite 4.00
Distance moyenne top 5: 0.18 km
missions_ineligibles: aucune

| Rang | Mission | Titre | Distance km | Score moteur |
|---:|---|---|---:|---:|
| 1 | 362dfc32-8609-4811-bab7-5f4049b4d576 | Médiateur numérique pour l'accompagnement des usagers en préfecture (DEN/PFINAT) | 0.02 | 0.73 |
| 2 | 8e2968b0-53e1-44bf-ae52-d71c403496ce | Favoriser l’accès à la santé pour tous et toutes - Ville de Montpellier | 0.63 | 0.73 |
| 3 | 65081fea0dbd937c61bbcce6 | J'anime un atelier d'épanouissement ou une sortie culturelle | 0.05 | 0.73 |
| 4 | 67bf499b73fbd982c16c789a | Je donne un coup de pouce à la mobilité professionnelle en levant les freins à l'emploi | 0.09 | 0.73 |
| 5 | 686e9cb8819b0b2efaa2b274 |  ‍♂️Apprentissage du Français | 0.09 | 0.73 |

Justifications juge:
- Run 0: coherence 4, homogeneite 4. Quatre missions sur cinq correspondent bien au profil de Julie, qui souhaite un engagement régulier à Montpellier, avec un intérêt pour l'animation et l'aide directe. Les missions 1 (animation d'ateliers), 3 (apprentissage du français), 4 (aide à la mobilité professionnelle) et 2 (médiateur numérique) sont adaptées à ses motivations et capacités. La mission 0, bien que localisée à Montpellier, est plus axée sur la santé et la prévention, ce qui semble moins en phase avec ses attentes.
- Run 1: coherence 4, homogeneite 4. Les missions 1, 2, 3 et 4 sont pertinentes pour Julie car elles correspondent à ses motivations de reprendre confiance et à ses intentions d'engagement dans l'animation et l'aide directe. La mission 1 (apprentissage du français) et la mission 2 (animation d'ateliers d'épanouissement) sont clairement en lien avec l'animation et le soutien direct, favorisant la confiance en soi. La mission 3 (accès à la santé) implique un accompagnement direct et social, ce qui peut aussi aider à reprendre confiance. La mission 4 (aide à la mobilité professionnelle) est en lien avec l'insertion professionnelle, ce qui peut aussi contribuer à sa motivation. La mission 0, bien que localisée à Montpellier, est plus administrative et moins centrée sur l'animation ou l'aide directe, donc moins pertinente.
### nadia-reprendre-activite

Profil: Nadia, 24 ans, demandeuse d'emploi à Rouen, veut reprendre une activité dans le bâtiment, l'industrie ou la logistique
Version algo: m2
Echelle des notes: 1 = tres faible, 5 = excellent. Verdict/geo/format/coherence/homogeneite sont notes sur 5; une violation de gate force le verdict a 1.
Verdict: 4.00 | geo 5.00 | format 5.00 | coherence 2.50 | homogeneite 3.50
Distance moyenne top 5: 0.95 km
missions_ineligibles: aucune

| Rang | Mission | Titre | Distance km | Score moteur |
|---:|---|---|---:|---:|
| 1 | 6194def9a99ff4075b5edc34 | Logistique et transport de matériel événements | 1.66 | 0.77 |
| 2 | 62b0b752d559470714fc2c5a | Je deviens réparateur au sein d'un Repair Café | 2.85 | 0.75 |
| 3 | 65bcd2a3465156f505e9b0d6 | J'accompagne la transition écologique des entrepreneurs | 0.05 | 0.70 |
| 4 | 68bead10f7b3b996db36ca7e | Je veux encadrer des jeunes filles dans une séance de Football | 0.05 | 0.70 |
| 5 | 62aae159ca28ca06f349a4e5 | Participer aux actions de notre association ! | 0.13 | 0.70 |

Justifications juge:
- Run 0: coherence 3, homogeneite 3. Parmi les 5 missions proposées, 3 sont pertinentes pour Nadia qui souhaite reprendre une activité dans le bâtiment, l'industrie ou la logistique. La mission 2 (réparateur au Repair Café) correspond à des compétences techniques proches de l'industrie et la réparation. La mission 4 (logistique et transport de matériel) correspond directement à la logistique. La mission 1 (encadrement de jeunes filles au football) est moins directement liée mais peut correspondre à une activité régulière et encadrante. Les missions 0 et 3 sont hors secteur d'activité souhaité.
- Run 1: coherence 2, homogeneite 4. Parmi les 5 missions proposées, seules deux semblent pertinentes pour Nadia qui souhaite reprendre une activité dans le bâtiment, l'industrie ou la logistique. La mission 2 (réparateur au Repair Café) correspond à des compétences techniques proches de l'industrie et la réparation, et la mission 4 (encadrement de jeunes filles au football) est moins directement liée mais peut impliquer une activité régulière et encadrée. Les autres missions sont plutôt orientées vers la logistique événementielle, la transition écologique ou l'action humanitaire, qui ne correspondent pas directement à son souhait de reprendre une activité dans le bâtiment, l'industrie ou la logistique.
### mehdi-cv-multi-duree

Profil: Mehdi, 29 ans, demandeur d'emploi à Bordeaux, veut enrichir son CV avec plusieurs formats possibles
Version algo: m2
Echelle des notes: 1 = tres faible, 5 = excellent. Verdict/geo/format/coherence/homogeneite sont notes sur 5; une violation de gate force le verdict a 1.
Verdict: 4.00 | geo 5.00 | format 5.00 | coherence 2.50 | homogeneite 3.50
Distance moyenne top 5: 0.14 km
Notes: Le parcours multi-duree est accepte par l'API mais potentiellement non atteignable dans l'UI actuelle si l'ecran duree reste mono-selection.
missions_ineligibles: aucune

| Rang | Mission | Titre | Distance km | Score moteur |
|---:|---|---|---:|---:|
| 1 | 67eac016530c8d21cd55d9b1 | Collecte et distribution | 0.00 | 0.73 |
| 2 | 6194d3dba99ff4075b5eceaa | Accompagnement personnes difficultés financières | 0.03 | 0.73 |
| 3 | 6194d169a99ff4075b5ecbd8 | Représentant/e de Ville sur Bordeaux | 0.03 | 0.73 |
| 4 | 61c5475ace285307902a46c6 | Je gère l'animation d'une antenne locale | 0.26 | 0.73 |
| 5 | 6900a5e5c5967b5e05e55321 | J'agis en Afrique sur la gestion et la valorisation des déchets | 0.39 | 0.73 |

Justifications juge:
- Run 0: coherence 3, homogeneite 4. Parmi les 5 missions proposées, trois sont pertinentes pour Mehdi qui souhaite enrichir son CV avec des missions régulières à temps plein et qui a des compétences en gestion/pilotage juridique. La mission 1 (accompagnement personnes en difficultés financières) correspond bien à ses compétences et motivation. La mission 3 (animation d'une antenne locale) implique gestion et coordination, ce qui peut enrichir son CV. La mission 4 (représentant de ville) offre une expérience de gestion de partenariats et organisation, également pertinente. Les missions 0 (collecte/distribution) et 2 (mission en Afrique pour retraités) sont moins adaptées à son profil et motivation.
- Run 1: coherence 2, homogeneite 3. Parmi les 5 missions proposées, seules les missions 1 (Représentant/e de Ville sur Bordeaux) et 4 (animation d'une antenne locale) semblent compatibles avec le profil de Mehdi, qui souhaite enrichir son CV avec des missions régulières à temps plein et a des compétences en gestion/pilotage juridique. La mission 1 offre une expérience de représentation et gestion de partenariats, et la mission 4 implique de l'animation et du suivi, ce qui peut valoriser ses compétences. Les autres missions sont soit trop spécialisées (gestion déchets, retraités), soit peu liées à ses compétences ou motivations (accompagnement financier, collecte/distribution).
### thomas-actif-competences

Profil: Thomas, 29 ans, salarié à Rennes, veut mettre ses compétences pro en gestion et management au service de l'intérêt général sur des missions ponctuelles
Version algo: m2
Echelle des notes: 1 = tres faible, 5 = excellent. Verdict/geo/format/coherence/homogeneite sont notes sur 5; une violation de gate force le verdict a 1.
Verdict: 3.50 | geo 5.00 | format 3.00 | coherence 3.00 | homogeneite 3.00
Distance moyenne top 5: 0.53 km
missions_ineligibles: aucune

| Rang | Mission | Titre | Distance km | Score moteur |
|---:|---|---|---:|---:|
| 1 | 6194dd25a99ff4075b5ed9ec | Evenement culturel | 0.39 | 0.73 |
| 2 | 68da5c617cee915183abeca5 | je plante des arbres pour les générations futures | 0.62 | 0.73 |
| 3 | 626fcfc2f8404306fd38e54f | Je coordonne la recherche de volontaire | 0.39 | 0.65 |
| 4 | 6552713f7076716a29b04111 | J'aide des familles en difficulté à partir en vacances | 0.39 | 0.65 |
| 5 | 67bcd08273fbd982c15b6be1 | Je communique sur le projet "J’accueille" en déposant des flyers / affiches | 0.83 | 0.65 |

Justifications juge:
- Run 0: coherence 3, homogeneite 3. Les missions 2, 3 et 4 impliquent des compétences en gestion, coordination, communication et organisation, ce qui correspond bien aux compétences professionnelles de Thomas en gestion et management. La mission 0 et 1 sont plus orientées vers l'accompagnement social ou des actions manuelles, moins en lien avec ses compétences spécifiques.
- Run 1: coherence 3, homogeneite 3. Les missions 1 et 4 correspondent bien aux compétences en gestion, management et organisation, ainsi qu'à l'intérêt général. La mission 0 est trop vague pour juger, la mission 2 est environnementale sans lien clair avec gestion/management, et la mission 3 est événementielle mais sans indication claire de gestion ou management, donc moins pertinente.
### clara-cesure-humanitaire

Profil: Clara, 25 ans, en césure à Paris, cherche une mission humanitaire ou solidaire à temps plein
Version algo: m2
Echelle des notes: 1 = tres faible, 5 = excellent. Verdict/geo/format/coherence/homogeneite sont notes sur 5; une violation de gate force le verdict a 1.
Verdict: 4.50 | geo 5.00 | format 5.00 | coherence 4.00 | homogeneite 3.50
Distance moyenne top 5: 0.70 km
missions_ineligibles: aucune

| Rang | Mission | Titre | Distance km | Score moteur |
|---:|---|---|---:|---:|
| 1 | 7fe2665a-b6db-4017-bb16-415e7e763cc7 | Sensibiliser le grand public aux gestes qui sauvent et accueillir le public sur les actions sociales | 0.39 | 0.78 |
| 2 | 6194dd02a99ff4075b5ed9cc | Animation d'ateliers numériques | 0.40 | 0.78 |
| 3 | 6911f4994da2b54ebc94de51 | Aide à la sensibilisation du public à la problématique de l'exploitation sexuelle | 0.75 | 0.78 |
| 4 | b42e52ab-1d53-4fad-8ece-9ac39a2194b9 | Être ambassadeur de l'Information Jeunesse. | 0.90 | 0.77 |
| 5 | 664d743211c8e83143f13af6 | Organiser des sorties pour lutter contre l'isolement des personnes âgées et en situation de handicap | 1.04 | 0.77 |

Justifications juge:
- Run 0: coherence 4, homogeneite 4. Quatre missions sur cinq correspondent bien au profil de Clara, qui cherche une mission humanitaire ou solidaire à temps plein à Paris. Les missions 1, 2, 3 et 4 sont clairement dans le domaine social et solidaire, avec un engagement à temps plein ou proche. La mission 0, bien que solidaire, est plus orientée vers l'initiation numérique et l'éducation, ce qui est moins directement lié au domaine international humanitaire ou social solidaire recherché.
- Run 1: coherence 4, homogeneite 3. Les missions 1, 3 et 4 correspondent bien au profil de Clara qui cherche une mission humanitaire ou solidaire à temps plein à Paris. La mission 1 est clairement sociale et solidaire, la mission 3 est liée à l'accompagnement social et numérique, et la mission 4 est une mission de sensibilisation dans un cadre humanitaire international. La mission 0 est moins pertinente car elle est à temps partiel et plus locale, la mission 2 est plus orientée vers l'information jeunesse et moins vers l'humanitaire ou la solidarité.
