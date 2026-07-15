# Rapport evaluation matching

Parcours: 15/15 reussis (0 echecs techniques).

## Metriques

| Critere | Moyenne | Min | Ecart-type |
|---|---:|---:|---:|
| verdict | 3.41 | 1.80 | 0.92 |
| coherence | 3.33 | 2.00 | 0.96 |
| homogeneite | 3.67 | 3.00 | 0.43 |
| geo | 4.07 | 1.00 | 1.44 |
| format | 2.47 | 1.00 | 1.86 |

Verdicts < 4: 73.33%
Gates: 0.00% parcours avec violation, 0/75 missions.
Sensibilite ordre: coherence 0.53, homogeneite 0.27, Jaccard pertinence 0.54.

## Segments

| Segment | Parcours | Verdict moyen |
|---|---:|---:|
| lyceen | 4 | 3.00 |
| etudiant | 5 | 3.94 |
| demandeur_emploi | 4 | 3.08 |
| actif | 1 | 2.70 |
| autre | 1 | 4.50 |

## Recommandations automatiques

- Cause majoritaire des parcours faibles: offre (10 parcours).
- Segment le plus faible: actif avec un verdict moyen de 2.70.

## Parcours

### lea-parcoursup-ifsi

Profil: Léa, 17 ans, lycéenne en Terminale à Lyon, veut booster son dossier Parcoursup pour une formation en soins infirmiers, avec peu de temps hors week-ends
Verdict: 3.30 | geo 5.00 | format 1.00 | coherence 3.00 | homogeneite 4.00
Notes: Texte libre Parcoursup non envoye: buildPayload ignore les answers text et le moteur consomme domaine=sante_soins.
Violations de gate: aucune

| Rang | Mission | Titre | Distance km | Score moteur |
|---:|---|---|---:|---:|
| 1 | 4b885232-0829-4b2e-8c9d-956c406ff58a | Va à la rencontre de jeunes pour participer à la déstigmatisation de la santé mentale | 0.85 | 0.64 |
| 2 | 55baa380-a094-4003-a400-d2d5e73ef655 | 🦽 Viens aider les personnes en situation de handicap et leur famille! - LYON  | 0.85 | 0.64 |
| 3 | 75d91afb-7897-4b9e-8402-b8ac19c4dd9c | Lyon - 👧🏼👦🏿 - Agis pour promouvoir les droits de l’enfant - Ambassadeur des Droits de l’Enfant | 0.85 | 0.56 |
| 4 | ddf0159f-bd8c-443c-aab9-ca3387708086 | 👵 Personnes âgées : contribue à la vie sociale, culturelle et citoyenne des plus isolées ! LYON 👴 | 0.85 | 0.56 |
| 5 | e15ea290-6cbf-4449-b6c1-4265b9240a9a | 🌍 Réalise des chantiers natures et sensibilise aux enjeux de la transition écologique - Lyon | 0.85 | 0.56 |

Justifications juge:
- Run 0: coherence 3, homogeneite 4. Parmi les 5 missions proposées, 3 sont pertinentes pour Léa qui souhaite un engagement ponctuel en santé/soins pour booster son dossier Parcoursup. La mission 2 est directement liée à la santé mentale, ce qui correspond bien à son domaine d'intérêt. La mission 4, bien que centrée sur les personnes âgées, touche à l'accompagnement social et pourrait être valorisée dans un dossier santé. La mission 0, liée au handicap, est aussi dans le domaine santé mais demande un engagement plus long et régulier, ce qui semble moins compatible avec son temps disponible. Les missions 1 et 3 sont hors domaine santé et moins pertinentes.
- Run 1: coherence 3, homogeneite 4. Les missions 1, 2 et 3 sont pertinentes car elles touchent au domaine de la santé et du soin, ce qui correspond à l'objectif de Léa de préparer une formation en soins infirmiers. La mission 1 traite de la santé mentale, la mission 2 de l'accompagnement des personnes en situation de handicap, et la mission 3 de l'aide aux personnes âgées, toutes liées au secteur sanitaire et social. Les missions 0 et 4 sont moins pertinentes car elles concernent les droits de l'enfant et l'environnement, qui ne correspondent pas directement au domaine santé-soins.
### noah-parcoursup-sans-formation

Profil: Noah, 16 ans, lycéen à Aurillac, veut booster Parcoursup sans formation précise et reste ouvert sur le domaine
Verdict: 1.80 | geo 1.00 | format 1.00 | coherence 2.50 | homogeneite 3.00
Violations de gate: aucune

| Rang | Mission | Titre | Distance km | Score moteur |
|---:|---|---|---:|---:|
| 1 | ed081198-c7f2-41e2-8e38-6af739349817 | 👴👵 SC2S 12 – LAGUIOLE- VIENS VIVRE UNE AVENTURE HUMAINE AVEC LES SENIORS DE L'EHPAD SAINTE-THERESE | 42.08 | 0.19 |
| 2 | 41236c65-7185-45d7-9b49-fd4545e67821 | Participer à l'organisation d'évènements d'animation locale et culturelle  | 44.43 | 0.18 |
| 3 | 6d8a85f0-22d3-4de8-81e6-6be6f1d2f0c2 | Favoriser la pratique sportive en terme d'inclusion et de santé | 44.92 | 0.18 |
| 4 | 7a810db2-18c9-48b8-9d83-39d2cc7d9242 | Aide à l'animation d'un lieu d'accueil autour du chemin de Compostelle | 54.64 | 0.15 |
| 5 | a9998510-da36-40e2-873a-d5b1bbe2b714 | Soutenir l’alimentation durable à Cros | 61.56 | 0.13 |

Justifications juge:
- Run 0: coherence 2, homogeneite 3. Parmi les 5 missions proposées, seules 2 semblent pertinentes pour un lycéen de 16 ans souhaitant booster son dossier Parcoursup sans formation précise et ouvert à divers domaines. Les missions 2 (animation locale et culturelle) et 3 (pratique sportive, inclusion et santé) offrent des expériences variées et formatrices, adaptées à un jeune sans spécialisation. Les autres missions sont plus spécifiques, longues, ou éloignées géographiquement, ce qui peut limiter leur pertinence.
- Run 1: coherence 3, homogeneite 3. Parmi les 5 missions proposées, 3 sont pertinentes pour Noah, un lycéen de 16 ans cherchant à booster son dossier Parcoursup sans domaine précis. Les missions 2 (animation autour du chemin de Compostelle), 3 (soutien à l'alimentation durable), et 4 (engagement avec les seniors en EHPAD) offrent des expériences variées et enrichissantes, adaptées à un jeune ouvert à différents domaines. Les missions 0 et 1 sont plus éloignées géographiquement et thématiquement, moins adaptées à son profil.
### sami-orientation-securite

Profil: Sami, 16 ans, lycéen en Seconde à Marseille, attiré par les métiers en uniforme et la sécurité, veut tester avant de choisir sa voie
Verdict: 3.20 | geo 5.00 | format 1.00 | coherence 3.00 | homogeneite 3.00
Violations de gate: aucune

| Rang | Mission | Titre | Distance km | Score moteur |
|---:|---|---|---:|---:|
| 1 | 277b55bb-cedf-4aa3-9422-36324e8a155c | Participer au développement de l'association Scène Méditerranée | 2.24 | 0.55 |
| 2 | 86d3e7f9-f4ec-4bbb-8f48-146b42786a19 | Promotion du patrimoine maritime méditerranéen au sein de L''EXPO' "musée vivant " de la Navale | 3.08 | 0.54 |
| 3 | e79136c7-e0f3-49ce-9612-608ccaf08438 | Sensibilisation et éducation à l’environnement du public accompagné. | 3.66 | 0.53 |
| 4 | 60e51a7feac373060d29791b | Je deviens bénévole secouriste ! | 17.15 | 0.48 |
| 5 | 4195449c-84bd-495d-9da1-8908e919dd57 | Créer du lien entre artistes et enfants hospitalisés au sein de la Compagnie Après la Pluie | 10.19 | 0.44 |

Justifications juge:
- Run 0: coherence 4, homogeneite 3. Parmi les 5 missions proposées, 4 sont pertinentes pour Sami, qui est intéressé par les métiers en uniforme et la sécurité, et souhaite tester son orientation. La mission 4 (bénévole secouriste) correspond directement à la sécurité et aux premiers secours, ce qui est très cohérent avec son profil. La mission 3 (promotion du patrimoine maritime) est moins directement liée à la sécurité mais peut intéresser un jeune curieux de métiers liés à la ville et à la mémoire locale, ce qui peut être un test d'orientation. La mission 1 (sensibilisation à l'environnement) et la mission 2 (lien entre artistes et enfants hospitalisés) sont moins liées à la sécurité mais restent des missions d'engagement social et culturel qui peuvent intéresser un lycéen en phase de test d'orientation. La mission 0 (développement de l'association Scène Méditerranée) est hors sujet par rapport à ses motivations et centres d'intérêt.
- Run 1: coherence 2, homogeneite 3. Parmi les 5 missions proposées, seules les missions 1 (bénévole secouriste) et 4 (développement d'une association culturelle avec médiation sociale) sont partiellement en lien avec l'intérêt de Sami pour les métiers en uniforme et la sécurité, ainsi que pour tester une orientation. La mission 1 est directement liée à la sécurité et premiers secours, ce qui correspond bien à son profil. La mission 4, bien que culturelle, implique un engagement social et une médiation qui peuvent intéresser un jeune en phase de test d'orientation, mais elle est moins directement liée à la sécurité ou aux métiers en uniforme. Les autres missions sont plutôt orientées vers le patrimoine, l'environnement ou l'animation artistique, ce qui ne correspond pas à ses motivations principales.
### manon-utile-terrain

Profil: Manon, 16 ans, lycéenne à Lille, cherche une mission ponctuelle utile et concrète sur le terrain
Verdict: 3.70 | geo 5.00 | format 1.00 | coherence 4.00 | homogeneite 4.00
Violations de gate: aucune

| Rang | Mission | Titre | Distance km | Score moteur |
|---:|---|---|---:|---:|
| 1 | e1ade3d6-62a4-425d-9456-74936c9e6c39 | Accompagner et informer les usagers dans les services du ministère de l'Intérieur - DII - asile | 0.37 | 0.67 |
| 2 | 45b7328f-2491-4926-a5e1-b9cebc77726c | Ambassadeur·rice pour l’Égalité et la Lutte contre les Discriminations | 1.86 | 0.65 |
| 3 | 21161f6c-c59b-4791-989b-410fc064f567 | Faciliter l’utilisation des outils numériques et l’accès aux médias (CSCV) | 4.93 | 0.60 |
| 4 | f5c426aa-94b0-488a-a364-92dfa009e9f9 | Part’âges, sourires et seniors à la résidence Les Roses à Lille (59) | 5.08 | 0.60 |
| 5 | 0083447f-07b8-4043-8ede-98c67dfcb657 | Créer du lien social auprès des séniors au sein de l'EHPAD Les Marronniers | 5.60 | 0.59 |

Justifications juge:
- Run 0: coherence 4, homogeneite 4. Les missions 1, 2, 3 et 4 correspondent bien au profil de Manon, qui cherche une mission ponctuelle, utile et concrète sur le terrain avec une aide directe et une action de terrain. Ces missions impliquent un contact direct avec des publics variés (numérique, jeunes, seniors) et des actions concrètes. La mission 0, bien que sur Lille et utile, inclut une part importante de renfort administratif, moins adaptée à une recherche d'action terrain concrète.
- Run 1: coherence 4, homogeneite 4. Quatre missions sur cinq correspondent bien au profil de Manon, une lycéenne de 16 ans cherchant une mission ponctuelle, utile et concrète sur le terrain avec une aide directe et action terrain. Les missions 1, 2, 3 et 4 proposent des actions concrètes d'accompagnement, d'animation ou d'aide directe auprès de publics variés, en lien avec ses motivations et localisation. La mission 0, bien que proche, semble plus longue (24-30h) et orientée service civique seniors, ce qui peut être moins ponctuel et moins adapté à un jeune lycéen cherchant une mission ponctuelle.
### emma-cv-communication

Profil: Emma, 20 ans, étudiante en L2 info-com à Paris, cherche à valoriser son CV avec des compétences en communication et numérique
Verdict: 3.90 | geo 5.00 | format 1.00 | coherence 4.50 | homogeneite 4.00
Violations de gate: aucune

| Rang | Mission | Titre | Distance km | Score moteur |
|---:|---|---|---:|---:|
| 1 | 2f4d75ad-9875-4cfe-b775-2d1b8ed0b13b | Je participe à la communication d’une fédération | 2.16 | 0.76 |
| 2 | 39012138-1b27-437f-a364-0f882fbc0221 | Renforcer la sensibilisation environnementale en France et au Cambodge | 0.60 | 0.69 |
| 3 | 20ebfde0-6186-4a3e-bcb7-30d70af7e1ed | Participation au projet de promotion du Jazz à Paris et en Île-de-France | 0.48 | 0.69 |
| 4 | 165c3653-59eb-4d8b-ab44-d9028e305048 | Chargé(e) de communication Sensibilisation Entrepreneuriat Etudiant – Pépite Sorbonne Université | 1.16 | 0.68 |
| 5 | e8852283-7b4c-43fb-96da-d8d31f42592d | La mission est d'aider à l’évaluation de l'impact de la structure sur les bénéficiaires | 1.25 | 0.68 |

Justifications juge:
- Run 0: coherence 4, homogeneite 4. Les missions 1, 2 et 4 sont clairement en lien avec la communication et la création numérique, ce qui correspond bien au profil d'Emma qui souhaite valoriser ses compétences en communication et numérique. La mission 0 inclut aussi des tâches de communication mais est plus orientée vers la sensibilisation environnementale, ce qui est moins directement lié à ses objectifs. La mission 3 est centrée sur l'évaluation d'impact et l'entrepreneuriat dans les quartiers populaires, ce qui est moins pertinent pour ses compétences et motivations.
- Run 1: coherence 5, homogeneite 4. Toutes les missions proposées correspondent bien au profil d'Emma, qui cherche à valoriser ses compétences en communication et numérique. Chaque mission implique des tâches de communication, création de contenu, sensibilisation ou gestion de réseaux sociaux, ce qui est pertinent pour son objectif de booster son CV dans ce domaine.
### hugo-terrain-temps-plein

Profil: Hugo, 22 ans, étudiant en césure à Nantes, veut une vraie première expérience terrain à temps plein, ouvert au service civique indemnisé
Verdict: 4.90 | geo 5.00 | format 5.00 | coherence 5.00 | homogeneite 4.00
Violations de gate: aucune

| Rang | Mission | Titre | Distance km | Score moteur |
|---:|---|---|---:|---:|
| 1 | b2f179ee-f855-49ba-9a8d-fc3e15343862 | Participer aux actions de prévention santé auprès des jeunes à Nantes 🪩 | 0.61 | 0.79 |
| 2 | f20c3900-28de-4a18-a6ac-c6bbf63ce1e7 | Partager des activités avec des personnes en situation de handicap au sein d'un GEM | 0.68 | 0.79 |
| 3 | 887ea189-8be9-470f-baa7-2f69e48be65a | Valoriser les actions et la parole des personnes en situation de handicap intellectuel. | 0.72 | 0.78 |
| 4 | 7db283bb-2183-48b9-a756-5c0393ba8e54 | Accompagnement de binômes (étudiant.e.s bénévoles/enfants) et animation d’ateliers collectifs CM2>3e | 1.12 | 0.78 |
| 5 | 1b6732a5-b37e-4777-b9cc-a7cf2e0f4e50 | Animateur.rice Lien social : Crée du lien sur Nantes entre personnes avec et sans domicile ! | 1.37 | 0.77 |

Justifications juge:
- Run 0: coherence 5, homogeneite 4. Toutes les missions proposées sont en service civique à Nantes, à temps plein ou plus de 24h par semaine, ce qui correspond parfaitement à la demande d'Hugo pour une première expérience terrain à temps plein en service civique indemnisé. Les missions couvrent des domaines liés à la santé, au social, à l'animation et à l'accompagnement, en lien avec sa formation sociale, santé, sport et sa motivation pour une expérience terrain.
- Run 1: coherence 5, homogeneite 4. Toutes les missions proposées sont en service civique à Nantes, à temps plein ou proche, et offrent une expérience terrain concrète, ce qui correspond parfaitement à la demande d'Hugo, étudiant en césure à Nantes cherchant une première expérience terrain à temps plein en service civique.
### camille-environnement

Profil: Camille, 24 ans, étudiante à Grenoble, veut découvrir le domaine de l'environnement et de la nature
Verdict: 3.70 | geo 5.00 | format 1.00 | coherence 4.00 | homogeneite 4.00
Violations de gate: aucune

| Rang | Mission | Titre | Distance km | Score moteur |
|---:|---|---|---:|---:|
| 1 | 428da171-87a0-473c-bb80-9c48f4b574d3 | Réparer des vélos et animer une boutique solidaire de sport - Recyclerie Sportive de Grenoble | 0.43 | 0.69 |
| 2 | 6d4a32cb-f032-4b59-bad6-658579c9fbd2 | Programmation culturelle et militante de la Base - tier-lieu associatif d'Alternatiba Grenoble | 0.81 | 0.68 |
| 3 | 262d54b3-7e8f-43d5-972a-c9906dd38259 | Agir pour une alimentation digne et de qualité pour tous à l'épicerie solidaire EPISOL ! | 1.34 | 0.67 |
| 4 | 187211ca-0593-40fa-9d27-aa18587f0c71 | Sensibiliser le grand public à l'autoproduction et l'auto-construction écologique | 1.77 | 0.67 |
| 5 | bc619bec-636a-41dd-a7d2-ff7757201d08 | Sensibiliser le grand public à l'autoproduction et l'auto-construction écologique | 1.77 | 0.67 |

Justifications juge:
- Run 0: coherence 4, homogeneite 4. Quatre missions sur cinq sont clairement liées au domaine de l'environnement et de la nature, correspondant bien à la motivation de Camille pour découvrir ce domaine. La mission 0 est moins directement liée à l'environnement, elle est plus centrée sur l'inclusion sociale via la menuiserie, bien que mentionnant des valeurs écologiques. Les missions 1, 2, 3 et 4 abordent la sensibilisation environnementale, la réduction des déchets, l'alimentation durable et la programmation d'événements militants environnementaux, ce qui correspond bien au profil.
- Run 1: coherence 4, homogeneite 4. Quatre missions (1, 2, 3, 4) sont clairement liées à l'environnement, la nature, ou la sensibilisation écologique, correspondant bien au souhait de Camille de découvrir ce domaine. La mission 0 est plus orientée vers le sport et la réparation d'objets, moins directement liée à l'environnement et la nature, donc moins pertinente.
### ines-rural-aide-directe

Profil: Inès, 24 ans, étudiante en M1 à Figeac, veut se sentir utile et aider directement des personnes en zone rurale
Verdict: 2.55 | geo 2.00 | format 3.00 | coherence 2.50 | homogeneite 3.50
Violations de gate: aucune

| Rang | Mission | Titre | Distance km | Score moteur |
|---:|---|---|---:|---:|
| 1 | 0d479e6a-5780-4d71-bc35-5d71de892b61 | FIGEAC Accompagner les usagers sur les outils numériques de France Travail | 0.64 | 0.69 |
| 2 | 3f294e86-9c83-456d-a251-3e0735118307 | 👴👵 SC2S 12 - VILEEFRANCHE-DE-ROUERGUE: S'ENGAGER POUR LES SENIORS AVEC LE CCAS | 28.75 | 0.38 |
| 3 | 61f12a5a51d4c407ac023ddf | J'assure le service des petits déjeuners pour les personnes à la rue à Avignon | 233.18 | 0.30 |
| 4 | 62283732285e0d07a06a1c2b | Je bricole ou je jardine pour des personnes  en situation de handicap | 403.01 | 0.30 |
| 5 | 00007e3e-6bdd-4188-a18d-e6365411b0b5 | J'accompagne vers l’emploi une personne réfugiée 1️⃣1️⃣ Atelier 👉Préparer mes entretiens 🏋️‍♂️ le 24 juin 2026 | 474.80 | 0.30 |

Justifications juge:
- Run 0: coherence 2, homogeneite 4. Parmi les 5 missions proposées, seules deux correspondent clairement au profil d'Inès qui souhaite un engagement ponctuel, utile, avec aide directe à des personnes en zone rurale proche de Figeac. La mission 4 (service petit déjeuner aux personnes à la rue) et la mission 1 (engagement auprès des seniors) impliquent un contact direct avec des personnes et un engagement social. Les autres missions sont soit trop éloignées géographiquement (missions 2, 3), soit centrées sur l'accompagnement numérique (mission 0) qui est moins directement une aide humaine en zone rurale.
- Run 1: coherence 3, homogeneite 3. Parmi les 5 missions proposées, 3 sont pertinentes pour Inès qui souhaite aider directement des personnes en zone rurale autour de Figeac. La mission 3 est à Figeac même et implique un accompagnement direct des usagers, ce qui correspond bien. La mission 2, bien que située à Avignon (233 km), propose un contact direct avec des personnes en difficulté, ce qui correspond à son souhait d'aide directe. La mission 1, même si située au Mans (403 km), propose un engagement direct auprès de personnes en situation de handicap, ce qui est pertinent. Les missions 0 et 4 sont trop éloignées ou concernent des publics moins en lien avec la demande précise d'Inès.
### lucas-sans-signal

Profil: Lucas, 19 ans, étudiant à Toulouse, n'a pas encore de préférence claire et veut explorer les missions disponibles
Verdict: 4.65 | geo 5.00 | format 5.00 | coherence 4.50 | homogeneite 3.50
Violations de gate: aucune

| Rang | Mission | Titre | Distance km | Score moteur |
|---:|---|---|---:|---:|
| 1 | c0d85e5c-6d73-491e-9c9f-83f16dc4925a | Mettre en valeur la découverte de l’occitan au sein du réseau Calandreta en Midi-Pyrénées | 0.45 | 0.59 |
| 2 | c84ac5e4-28a4-4238-ba94-caf2a292954a | Participation à la médiation culturelle et valorisation du patrimoine occitan parmi le grand public  | 0.45 | 0.59 |
| 3 | 82f1c795-6cf8-4d94-9634-3ddf4ecaa14e | Permettre à des publics éloignés d'accéder à la culture. | 0.46 | 0.59 |
| 4 | 82843788-8de6-4a8f-bce3-99fdbd10689a |  Contribuer au développement et à la valorisation des actions d’une association  | 0.77 | 0.59 |
| 5 | 11941d6a-46c2-4c36-bb7e-41ffc01f4cd3 | Planeur Colmar - 🛬 Viens promouvoir le vol en planeur dans une démarche de développement durable ! | 0.86 | 0.59 |

Justifications juge:
- Run 0: coherence 5, homogeneite 3. Toutes les missions proposées sont localisées à Toulouse ou très proches, adaptées à un jeune étudiant sans préférence claire souhaitant explorer diverses missions. Elles couvrent des domaines variés (culture occitane, développement durable, insertion sociale, médiation culturelle) offrant une bonne diversité d'expériences.
- Run 1: coherence 4, homogeneite 4. Quatre missions sur cinq sont localisées à Toulouse et concernent des domaines variés mais accessibles à un jeune étudiant sans préférence claire, permettant une bonne exploration. La mission 0 est hors localisation (Colmar) et moins pertinente pour ce profil.
### karim-reconversion

Profil: Karim, 28 ans, demandeur d'emploi à Saint-Étienne, en reconversion, veut tester un nouveau secteur avant de se former
Verdict: 1.90 | geo 2.00 | format 1.00 | coherence 2.00 | homogeneite 3.00
Violations de gate: aucune

| Rang | Mission | Titre | Distance km | Score moteur |
|---:|---|---|---:|---:|
| 1 | 623bf834afe67c079c1fffdb | J’apporte un soutien aux enfants et jeunes, notamment dans les quartiers populaires, les zones rurales et territoires fragiles | 49.66 | 0.17 |
| 2 | 61c2abf6ce2853079029d3b5 | J'interviens en tant qu’aide au référent informatique | 52.02 | 0.17 |
| 3 | 67b5990bca07a268ced38e6e | Je m'engage en tant que mécanicien au sein d'un atelier de réparation de vélos | 585.83 | 0.16 |
| 4 | 0033eaee-8494-4058-8a62-548385787076 | Je donne un coup de pouce pour trouver des financements | distance | 0.13 |
| 5 | 00544309-6c20-4370-838a-583c171f63de | Je deviens sapeur-pompier volontaire près de chez moi | n/a | 0.13 |

Justifications juge:
- Run 0: coherence 2, homogeneite 3. Parmi les 5 missions proposées, seules deux sont relativement pertinentes pour Karim qui souhaite tester un nouveau secteur avant une formation technique ou industrielle. La mission 1 (aide au référent informatique) peut offrir une expérience technique, bien que située à Lyon, et la mission 3 (soutien scolaire) est moins directement liée mais reste une activité d'engagement local. Les autres missions sont soit trop éloignées géographiquement, soit dans des domaines non liés à sa reconversion technique (financement, mécanique vélo, sapeur-pompier).
- Run 1: coherence 2, homogeneite 3. Parmi les 5 missions proposées, seules deux semblent pertinentes pour Karim qui souhaite tester un nouveau secteur technique ou industriel avant de se former. La mission 2 (sapeur-pompier volontaire) offre une formation progressive et des compétences pratiques, ce qui peut correspondre à une reconversion. La mission 3 (mécanicien vélo) implique des compétences techniques et manuelles, ce qui peut aussi être un test dans un secteur technique. Les autres missions sont soit trop éloignées du secteur industriel/technique (missions 0,1,4) soit trop éloignées géographiquement (missions 0,1,3).
### julie-handicap-confiance

Profil: Julie, 26 ans, demandeuse d'emploi à Montpellier, en situation de handicap, veut reprendre confiance
Verdict: 3.20 | geo 4.00 | format 1.00 | coherence 3.50 | homogeneite 4.00
Violations de gate: aucune

| Rang | Mission | Titre | Distance km | Score moteur |
|---:|---|---|---:|---:|
| 1 | a5a92db7-d608-4696-9ecf-fa8fc18eeebb | Contribuer au lien social dans un quartier Politique de la ville de Montpellier (Petit Bard/Pergola) | 3.34 | 0.60 |
| 2 | e34e97a8-0bbc-4854-80e6-4a45595b76f6 | Sensibilisation et Promotion du Voyage participatif | 3.59 | 0.59 |
| 3 | 0d132648-b9ac-46d4-bc3a-1d654fc05208 | Contribuer au vivre ensemble et accompagner les élèves dans leur développement global | 6.98 | 0.55 |
| 4 | 78e15443-cbc3-4cb9-bbb1-ee0644dbba18 | Sensibiliser le grand public sur les défis climatiques et environnementaux. | 24.68 | 0.36 |
| 5 | 97883a6b-9d6a-4d1b-8300-1a465ce0f4ce | Service civique : Participer au bonheur de nos résidents au sein de l'EHPAD LES MAZETS DE L'ARGILIER | 26.91 | 0.36 |

Justifications juge:
- Run 0: coherence 4, homogeneite 4. Les missions 2, 3 et 4 sont clairement en lien avec l'objectif de reprendre confiance par l'engagement social et l'animation, avec un contact direct et un accompagnement des publics (quartier, élèves, personnes âgées). La mission 1, bien que centrée sur le voyage participatif, inclut de l'animation et de la sensibilisation à Montpellier, ce qui peut aussi correspondre à ses motivations. La mission 0 est moins pertinente car elle est éloignée géographiquement et centrée sur l'environnement, sans lien direct avec l'animation ou l'aide directe.
- Run 1: coherence 3, homogeneite 4. Parmi les 5 missions, trois sont pertinentes pour Julie qui souhaite reprendre confiance via un engagement régulier en animation et aide directe. La mission 0 (lien social quartier) est partiellement pertinente mais moins ciblée sur animation directe. La mission 1 (accompagnement élèves) correspond bien à l'animation et aide directe, favorisant la confiance. La mission 4 (EHPAD) propose animation et lien social, adaptée à son profil. La mission 3 (voyage participatif) est moins en lien avec aide directe ou animation locale. La mission 2 (sensibilisation environnement) est éloignée de ses motivations et compétences.
### nadia-reprendre-activite

Profil: Nadia, 24 ans, demandeuse d'emploi à Rouen, veut reprendre une activité dans le bâtiment, l'industrie ou la logistique
Verdict: 2.90 | geo 5.00 | format 1.00 | coherence 2.00 | homogeneite 4.00
Violations de gate: aucune

| Rang | Mission | Titre | Distance km | Score moteur |
|---:|---|---|---:|---:|
| 1 | 91b9216e-ac8c-4998-ac2f-8cd71b8ff2c6 | Promotion de l'aviron en milieu scolaire et universitaire et de l'aviron indoor | 0.89 | 0.58 |
| 2 | c59da33b-dc6d-417c-b97b-871d89cb5f8a | Accompagnement du développement du tennis chez les jeunes et valorisation des clubs | 1.02 | 0.58 |
| 3 | d2b12b5f-0481-4352-b002-1e9d29481923 | Contribuer au développement de l'utilisation de l'Agnel - la monnaie locale du grand Diepp | 1.55 | 0.57 |
| 4 | 9c04a2fe-e19b-4c7c-a471-4992652741be | Soutien à l'animation d'un tiers-lieu militant, associatif, social et environnemental  | 1.69 | 0.57 |
| 5 | f3b9eaf2-10e7-4c8b-9531-b2e9b6d0554e | Accompagner les usagers dans l’utilisation des outils numériques de France Travail | 2.29 | 0.56 |

Justifications juge:
- Run 0: coherence 2, homogeneite 4. Parmi les 5 missions proposées, seules les missions 2 et 3 peuvent être considérées comme partiellement pertinentes pour Nadia. La mission 2 concerne l'accompagnement numérique pour demandeurs d'emploi, ce qui peut aider Nadia dans sa recherche d'emploi et sa réinsertion professionnelle. La mission 3, bien que plus généraliste et associative, peut offrir une expérience d'animation et de gestion qui pourrait être utile. Les autres missions sont centrées sur le sport ou la promotion d'une monnaie locale, sans lien direct avec le secteur bâtiment, industrie ou logistique, ni avec la reprise d'activité professionnelle.
- Run 1: coherence 2, homogeneite 4. Parmi les 5 missions proposées, seules les missions 3 et 4 peuvent être considérées comme partiellement pertinentes. La mission 3 concerne l'accompagnement numérique pour les demandeurs d'emploi, ce qui peut aider Nadia dans sa recherche d'emploi et reprise d'activité. La mission 4, bien que moins directement liée au bâtiment, industrie ou logistique, propose une animation et gestion d'un tiers-lieu associatif, ce qui peut offrir une expérience professionnelle régulière. Les autres missions sont centrées sur le sport ou la monnaie locale, sans lien avec le secteur d'activité souhaité.
### mehdi-cv-multi-duree

Profil: Mehdi, 29 ans, demandeur d'emploi à Bordeaux, veut enrichir son CV avec plusieurs formats possibles
Verdict: 4.30 | geo 5.00 | format 5.00 | coherence 3.50 | homogeneite 4.00
Notes: Le parcours multi-duree est accepte par l'API mais potentiellement non atteignable dans l'UI actuelle si l'ecran duree reste mono-selection.
Violations de gate: aucune

| Rang | Mission | Titre | Distance km | Score moteur |
|---:|---|---|---:|---:|
| 1 | 678fb405ca07a268ceace66f | Je distribue les flyers | 7.55 | 0.54 |
| 2 | 678fb427ca07a268ceacea55 | J'aide les populations au Togo | 7.55 | 0.54 |
| 3 | e3037cb3-285b-428e-8be1-734cbd69d039 | Je répare des vélos lors d'ateliers participatifs | 5.72 | 0.48 |
| 4 | 678fb427ca07a268ceacea45 | Je gere la tresorerie de nos actions en faveur des personnes handicapées (sourdes) | distance | 0.29 |
| 5 | 0033eaee-8494-4058-8a62-548385787076 | Je donne un coup de pouce pour trouver des financements | distance | 0.29 |

Justifications juge:
- Run 0: coherence 3, homogeneite 4. Parmi les 5 missions proposées, trois semblent pertinentes pour Mehdi qui souhaite enrichir son CV avec des missions régulières et à temps plein, en lien avec ses compétences en gestion et pilotage juridique. La mission 4 (recherche de financements) correspond bien à ses compétences et motivation. La mission 0 (gestion de trésorerie) est aussi pertinente mais elle est à 1h par semaine, donc peu compatible avec un temps plein. La mission 1 (aide au Togo) est une expérience valorisante mais demande un engagement de 2 semaines minimum, ce qui peut être compatible. Les missions 2 (réparation de vélos) et 3 (distribution de flyers) sont moins en lien avec ses compétences et motivation.
- Run 1: coherence 4, homogeneite 4. Parmi les 5 missions proposées, deux sont clairement pertinentes pour Mehdi qui souhaite enrichir son CV avec des compétences en gestion, pilotage juridique et recherche de financements. La mission 3 (gestion de trésorerie) et la mission 4 (aide à la recherche de financements) correspondent bien à ses compétences et objectifs. Les autres missions sont moins en lien avec son profil et motivation.
### thomas-actif-competences

Profil: Thomas, 29 ans, salarié à Rennes, veut mettre ses compétences pro en gestion et management au service de l'intérêt général sur des missions ponctuelles
Verdict: 2.70 | geo 2.00 | format 5.00 | coherence 2.00 | homogeneite 3.00
Violations de gate: aucune

| Rang | Mission | Titre | Distance km | Score moteur |
|---:|---|---|---:|---:|
| 1 | 2e26c4e6-dd3e-49d8-afc1-997d27ebd335 | Je m'engage pour "Alabelecole : Projet de lutte contre le (cyber)harcèlement" | distance | 0.29 |
| 2 | 00007e3e-6bdd-4188-a18d-e6365411b0b5 | J'accompagne vers l’emploi une personne réfugiée 1️⃣1️⃣ Atelier 👉Préparer mes entretiens 🏋️‍♂️ le 24 juin 2026 | 311.45 | 0.24 |
| 3 | 62283732285e0d07a06a1c2b | Je bricole ou je jardine pour des personnes  en situation de handicap | 139.88 | 0.24 |
| 4 | 61f12a5a51d4c407ac023ddf | J'assure le service des petits déjeuners pour les personnes à la rue à Avignon | 682.42 | 0.24 |
| 5 | 678fb40cca07a268ceace748 | Je favorise l'apprentissage de la langue française | 587.07 | 0.24 |

Justifications juge:
- Run 0: coherence 2, homogeneite 4. Parmi les 5 missions proposées, seules les missions 0 et 4 (index 0 et 4) sont ponctuelles et peuvent potentiellement correspondre à un engagement utilisant des compétences en gestion, management ou organisation. Cependant, la mission 0 est très orientée communication et sensibilisation, sans mention claire de gestion ou management, et est à distance. La mission 4 propose un engagement ponctuel mais plutôt manuel (bricolage, jardinage) sans lien direct avec les compétences professionnelles de Thomas. Les autres missions sont soit localisées loin de Rennes, soit ne correspondent pas à ses compétences ou à son souhait de missions ponctuelles avec ses compétences pro. Donc seulement 2 missions sont partiellement pertinentes.
- Run 1: coherence 2, homogeneite 2. Parmi les 5 missions proposées, seules 2 semblent pertinentes pour Thomas. La mission 4 (lutte contre le cyberharcèlement) peut impliquer des compétences en gestion de projet et communication, et la mission 1 (accompagnement vers l'emploi) bien que située à Paris, correspond à un engagement ponctuel avec un aspect de gestion et accompagnement. Les autres missions sont soit trop éloignées géographiquement, soit ne correspondent pas à ses compétences professionnelles en gestion et management.
### clara-cesure-humanitaire

Profil: Clara, 25 ans, en césure à Paris, cherche une mission humanitaire ou solidaire à temps plein
Verdict: 4.50 | geo 5.00 | format 5.00 | coherence 4.00 | homogeneite 4.00
Violations de gate: aucune

| Rang | Mission | Titre | Distance km | Score moteur |
|---:|---|---|---:|---:|
| 1 | b7cae2ab-0cdc-4d9f-b757-20b9c9998bc2 | Accueillir et soutenir l’accompagnement des personnes LGBTQI+ migrantes et réfugiées | 0.68 | 0.79 |
| 2 | 075c3a53-34d7-4b9b-800b-7a3e70b07698 | Animation d'un Café Social destinés aux seniors survivants de la Shoah.  | 0.56 | 0.78 |
| 3 | e09735bc-6fb4-4603-8a6d-aa409a9bc338 | Défendre les droits de l'enfant | 0.75 | 0.78 |
| 4 | f786fa4f-a85a-4eec-a1e9-494a1df90ec7 | Participer aux interventions scolaires de la Licra contre le racisme et l'antisemitisme  | 1.04 | 0.77 |
| 5 | 3cf935a1-dad8-46dd-b81f-c2aec9654317 | Co-anime des ateliers & accompagne des élèves de 3e dans leur orientation en Ile de France ! | 1.25 | 0.77 |

Justifications juge:
- Run 0: coherence 4, homogeneite 4. Quatre missions sur cinq correspondent bien au profil de Clara, qui cherche une mission humanitaire ou solidaire à temps plein à Paris. La mission 4 (accompagnement des personnes LGBTQI+ migrantes et réfugiées) est clairement dans le domaine social et solidaire, à temps plein. La mission 1 (animation d'un café social pour seniors survivants de la Shoah) est aussi solidaire et à Paris, bien que le rythme soit un peu moins que temps plein. La mission 2 (interventions scolaires contre le racisme) est dans le domaine social et militant, proche du profil. La mission 3 (ateliers d'orientation pour élèves) est sociale et solidaire, bien que plus éducative. La mission 0 (défense des droits de l'enfant) est moins directement liée au domaine international humanitaire ou social de terrain, plus axée sur plaidoyer et communication, donc moins pertinente.
- Run 1: coherence 4, homogeneite 4. Quatre missions (1, 2, 3, 4) correspondent bien au profil de Clara qui cherche une mission humanitaire ou solidaire à temps plein à Paris, avec un intérêt pour le domaine international humanitaire et social/solidarité. La mission 0 est plus orientée vers l'éducation et l'orientation scolaire, moins centrée sur l'humanitaire ou la solidarité internationale, donc moins pertinente.
