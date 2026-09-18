/**
 * Offres Réserve Opérationnelle des Armées (ROC).
 *
 * Un seul publisher annonceur (ROC) porte les 7 offres ; chaque offre a un
 * `clientId` distinct. Les champs `type` et `postedAt` sont ajoutés par le
 * script au moment de l'envoi.
 */

export const ROC_TYPE = "volontariat_reserve_operationnelle" as const;

export const ROC_OFFERS = [
  {
    clientId: "roc-eaj-encadrant-equipier",
    title: "Militaire du rang de réserve / sous-officier - Encadrant équipier escadrille air jeunesse (EAJ)",
    description: `<p>Au sein de l'Escadrille air jeunesse de l'Armée de l'Air et de l'Espace, vous animez et encadrez les équipiers EAJ lors des sessions d'activités (vols d'initiation, cours théoriques sur l'aéronautique, visites de bases aériennes, rencontres avec des pilotes professionnels, simulations de vol), dans le respect des valeurs de l'AAE.</p>
<h3>Vos missions</h3>
<ul>
<li>Animer et encadrer les équipiers EAJ, veiller au bon déroulement des sessions dans un cadre sécurisé.</li>
<li>Organiser les activités conformément au référentiel (planning, déroulé de séance, convocation des équipiers, réservation des moyens).</li>
<li>Gérer la partie administrative de l'activité (note de service, assurance, transport).</li>
</ul>`,
    applicationUrl:
      "https://www.reservistes.defense.gouv.fr/lister-postes?filtres_liste_postes_form%5BniveauEtudesRequis%5D=&filtres_liste_postes_form%5Bgestionnaires%5D%5B%5D=304&filtres_liste_postes_form%5BdatePourvoiPoste%5D=&filtres_liste_postes_form%5BnbJoursActivites%5D%5Bvalue1%5D=0&filtres_liste_postes_form%5BnbJoursActivites%5D%5Bvalue2%5D=210&filtres_liste_postes_form%5Bpage%5D=1",
    image: "https://www.defense.gouv.fr/sites/default/files/styles/16_9_lg/public/air/2024_A106_138_L_001_024.jpg?itok=oaF-9UJx",
    domain: "service-public-defense-securite",
    activities: ["animation"],
    requirements: [
      "Aucun diplôme requis",
      "Formation exigée : PSC ; formation en encadrement souhaitée mais non obligatoire",
      "Savoir communiquer et parler en public",
      "Appétence pour le travail en équipe",
      "Bonne connaissance des spécialités et spécificités de l'armée de l'Air et de l'Espace",
      "Des connaissances en aéronautique sont un plus",
    ],
    softSkills: ["Sens du relationnel", "Rigueur", "Dynamisme", "Esprit d'équipe", "Motivation", "Disponibilité", "Pédagogie"],
    schedule:
      "Activités de septembre à juin, principalement le mercredi après-midi, ainsi que d'autres journées pour l'organisation et le suivi administratif. ~60 jours/an, contrat souhaité de 3 ans.",
    remote: "local",
    openToMinors: true,
    organizationName: "Armée de l'Air et de l'Espace",
    organizationUrl: "https://www.defense.gouv.fr/air",
    organizationDescription:
      "Les escadrilles Air Jeunesse proposent des activités telles que des vols d'initiation, des cours théoriques sur l'aéronautique, des visites de bases aériennes, des rencontres avec des pilotes professionnels, des simulations de vol.",
    organizationLogo:
      "https://thumb.wikimedia.org/wikipedia/commons/thumb/5/57/Logo_de_l%27Arm%C3%A9e_de_l%27Air_et_de_l%27Espace.svg/960px-Logo_de_l%27Arm%C3%A9e_de_l%27Air_et_de_l%27Espace.svg.png?utm_source=commons.wikimedia.org&utm_campaign=index&utm_content=thumbnail&_=20200912094014",
    organizationType: "Organisme militaire - Ministère des Armées",
    organizationStatusJuridique: "Organisme militaire - Ministère des Armées",
  },
  {
    clientId: "roc-eraae-equipier-3401",
    title: "Équipier ERAAE - indice de spécialité 3401",
    description: `<p>Au sein de l'Escadron de réserve de l'armée de l'Air et de l'Espace, unité assurant des missions de protection de la force et de sécurité sur le territoire national (contrats opérationnels en appui à la dissuasion nucléaire, soutien des bases aériennes, opérations de secours aux populations).</p>
<h3>Vos missions</h3>
<p><strong>Activités principales :</strong></p>
<ul>
<li>Contrôler les accès et effectuer du filtrage.</li>
<li>S'intégrer dans une patrouille de spécialistes protection (en enceinte air, après formation, au travail à proximité des équipes cynophiles, hors missions d'intervention).</li>
<li>Effectuer des missions autonomes de surveillance et d'observation en enceinte air.</li>
</ul>
<p><strong>Activités secondaires :</strong></p>
<ul>
<li>Participer aux missions Sentinelle.</li>
</ul>`,
    applicationUrl:
      "https://www.reservistes.defense.gouv.fr/lister-postes?filtres_liste_postes_form%5BniveauEtudesRequis%5D=&filtres_liste_postes_form%5Bgestionnaires%5D%5B%5D=304&filtres_liste_postes_form%5BdatePourvoiPoste%5D=&filtres_liste_postes_form%5BnbJoursActivites%5D%5Bvalue1%5D=0&filtres_liste_postes_form%5BnbJoursActivites%5D%5Bvalue2%5D=210&filtres_liste_postes_form%5Bpage%5D=1",
    image: "https://devenir-aviateur.gouv.fr/uploads/media/1440x/06/2196-desktop%201%20s%C3%A9curit%C3%A9%20protection.webp?v=1-0",
    domain: "service-public-defense-securite",
    activities: ["operations-militaires"],
    requirements: [
      "Diplôme requis : Certificat d'Aptitude à l'emploi de réserviste (CAER) - formation interne",
      "Formation militaire initiale du réserviste (FMIR) - formation interne",
      "Formation militaire complémentaire de réserve (FMCR) - formation interne",
    ],
    softSkills: ["Capacité d'adaptation", "Rigueur", "Dynamisme", "Esprit d'équipe", "Motivation", "Disponibilité"],
    schedule: "Contrat de 3 ans souhaité, 60 jours d'activité par an. Périodes d'activité définies en fonction de la disponibilité du réserviste et des besoins de l'employeur.",
    remote: "local",
    openToMinors: true,
    organizationName: "Armée de l'Air et de l'Espace",
    organizationUrl: "https://www.defense.gouv.fr/air",
    organizationDescription:
      "Escadron de réserve de l'armée de l'Air et de l'Espace. Cette unité assure des missions de protection de la force et de sécurité sur le territoire national. Elle participe également aux contrats opérationnels en appui à la dissuasion nucléaire, au soutien des bases aériennes et aux opérations de secours aux populations.",
    organizationLogo:
      "https://thumb.wikimedia.org/wikipedia/commons/thumb/5/57/Logo_de_l%27Arm%C3%A9e_de_l%27Air_et_de_l%27Espace.svg/960px-Logo_de_l%27Arm%C3%A9e_de_l%27Air_et_de_l%27Espace.svg.png?utm_source=commons.wikimedia.org&utm_campaign=index&utm_content=thumbnail&_=20200912094014",
    organizationType: "Organisme militaire - Ministère des Armées",
    organizationStatusJuridique: "Organisme militaire - Ministère des Armées",
  },
  {
    clientId: "roc-jdc-animateur",
    title: "Animateur - Accompagnateur JDC",
    description: `<p>Officier / sous-officier de réserve (SGT à CNE), chargé d'animer les différents ateliers de la Journée Défense et Citoyenneté (JDC).</p>
<h3>Vos missions</h3>
<ul>
<li>Accompagner et guider un groupe de jeunes toute la journée.</li>
<li>Répondre aux questions des jeunes portant sur les métiers des armées, direction et services et culture militaire.</li>
<li>Co-animer des ateliers thématiques tels que tir sportif laser, atelier de réalité virtuelle et jeu de rôle « STRAT&amp;J ».</li>
<li>Contribuer à la logistique nécessaire au bon déroulement de la journée.</li>
</ul>`,
    applicationUrl:
      "https://www.reservistes.defense.gouv.fr/lister-postes?filtres_liste_postes_form%5BniveauEtudesRequis%5D=&filtres_liste_postes_form%5Bgestionnaires%5D%5B%5D=304&filtres_liste_postes_form%5BdatePourvoiPoste%5D=&filtres_liste_postes_form%5BnbJoursActivites%5D%5Bvalue1%5D=0&filtres_liste_postes_form%5BnbJoursActivites%5D%5Bvalue2%5D=210&filtres_liste_postes_form%5Bpage%5D=1",
    image: "https://www.defense.gouv.fr/sites/default/files/styles/16_9_md/public/sga/2024_SGA047_R_003_16_9.jpg?h=c673cd1c&itok=bqEcOsKP",
    domain: "memoire-et-citoyennete",
    activities: ["enseignement-formation"],
    requirements: ["Aucun diplôme requis", "Aucune formation exigée"],
    softSkills: ["Savoir-être", "Sens pédagogique", "Communication", "Goût du contact", "Connaissance du milieu militaire"],
    schedule:
      "Contrat de 1 à 5 ans souhaité, 30 jours d'activité par an. Périodes d'activité définies en fonction de la disponibilité du réserviste et des besoins de l'employeur.",
    remote: "local",
    openToMinors: true,
    organizationName: "Armée de l'Air et de l'Espace",
    organizationUrl: "https://www.defense.gouv.fr/air",
    organizationDescription:
      'Les Centres du Service National et de la Jeunesse (CSNJ) sont chargés de la mise en œuvre de la Journée Défense et Citoyenneté (JDC), étape obligatoire du parcours de citoyenneté pour tous les jeunes Français de 17 à 25 ans, ainsi que des Journées Défense et Mémoire (JDM). Répartis sur l\'ensemble du territoire métropolitain et outre-mer, les CSNJ contribuent également à la politique jeunesse du ministère des Armées (plan "ambition armées jeunesse") et constituent souvent le premier contact entre la jeunesse française et les armées.',
    organizationLogo:
      "https://thumb.wikimedia.org/wikipedia/commons/thumb/5/57/Logo_de_l%27Arm%C3%A9e_de_l%27Air_et_de_l%27Espace.svg/960px-Logo_de_l%27Arm%C3%A9e_de_l%27Air_et_de_l%27Espace.svg.png?utm_source=commons.wikimedia.org&utm_campaign=index&utm_content=thumbnail&_=20200912094014",
    organizationType: "Organisme militaire - Ministère des Armées",
    organizationStatusJuridique: "Organisme militaire - Ministère des Armées",
  },
  {
    clientId: "roc-seo-architecte-donnees",
    title: "Architecte de données, Réserviste Spécialiste",
    description: `<p>Réserviste au profit du Service de l'Énergie Opérationnelle et de son système d'information Réserviste Opérationnel Connecté (ROC).</p>
<p>Rejoignez l'équipe de l'État-Major des Armées et du Service de l'Énergie Opérationnelle, et participez au développement du système d'information ROC. Que vous soyez étudiant·e, salarié·e ou en recherche d'emploi, l'engagement s'adapte à votre rythme, sans quitter votre vie. Ce n'est pas un stage ni un week-end de cohésion : c'est un engagement réel, avec une unité, des missions et une formation dès le premier jour.</p>
<p>En tant que réserviste :</p>
<ul>
<li>travaillez en équipe pour participer au développement du SI ROC ;</li>
<li>participez à l'élaboration de la stratégie de recette, à l'écriture des cahiers de recette et à la recette du système d'information sur l'environnement de développement (PICSEL) et de pré-production ;</li>
<li>contribuez à la remontée au SI ROC des anomalies du système en production.</li>
</ul>
<p>Vous êtes formé·e et encadré·e à chaque étape, la formation initiale vous donne toutes les bases progressivement.</p>
<h3>Indemnisations complémentaires</h3>
<ul>
<li>🎯 Prime de fidélité : 250 € par an dès le 2e contrat (si minimum 37 jours par an).</li>
<li>🎓 Allocation mensuelle de 100 € pour les étudiant·e·s de moins de 25 ans (si contrat 5 ans, et minimum 37 j/an).</li>
<li>🚗 Financement du permis B jusqu'à 1 000 € pour les moins de 25 ans (50 jours de service effectués).</li>
</ul>`,
    applicationUrl:
      "https://www.reservistes.defense.gouv.fr/lister-postes?filtres_liste_postes_form%5BniveauEtudesRequis%5D=&filtres_liste_postes_form%5Bgestionnaires%5D%5B%5D=302&filtres_liste_postes_form%5BdatePourvoiPoste%5D=&filtres_liste_postes_form%5BnbJoursActivites%5D%5Bvalue1%5D=0&filtres_liste_postes_form%5BnbJoursActivites%5D%5Bvalue2%5D=210&filtres_liste_postes_form%5Bpage%5D=1",
    image: "https://devenir-aviateur.gouv.fr/uploads/media/1440x/09/879-%5B2%5D%20Slider_vertical-Resp_systeme_numerique-02.webp?v=1-0",
    domain: "numerique",
    activities: ["informatique"],
    requirements: [
      "17 ans et +",
      "Bac +2",
      "Connaissances bureautiques et maîtrise informatique (PICSEL, JIRA)",
      "Ouvert à toutes situations (étudiant·e, salarié·e, demandeur·euse d'emploi)",
      "Aptitude médicale requise",
      "Habiter en région parisienne",
    ],
    schedule: "Environ 50 jours par an. Contrat de 1 à 5 ans, renouvelable.",
    remote: "no",
    openToMinors: true,
    compensationAmount: 50,
    compensationAmountMax: 100,
    compensationUnit: "day",
    compensationType: "net",
    addresses: [{ region: "Île-de-France", country: "France" }],
    organizationName: "Service de l'Énergie Opérationnelle (SEO)",
    organizationUrl: "https://www.defense.gouv.fr/energie-ops",
    organizationDescription:
      "Le Service de l'énergie opérationnelle (SEO) est un service interarmées du ministère des Armées, garant de l'autonomie énergétique des forces armées françaises. Il assure l'approvisionnement, le stockage et la distribution des produits pétroliers nécessaires aux opérations militaires, en métropole, en zones de projection ou en opérations extérieures. Il conçoit, entretient et modernise les matériels pétroliers, définit les spécifications techniques et veille à la conformité réglementaire (transport de matières dangereuses, installations classées, sécurité). Son action s'étend au-delà du strict champ militaire : gendarmerie nationale et sécurité civile bénéficient également de son soutien.",
    organizationLogo:
      "https://thumb.wikimedia.org/wikipedia/commons/thumb/9/93/Logo_SEO.png/960px-Logo_SEO.png?utm_source=commons.wikimedia.org&utm_campaign=index&utm_content=thumbnail&_=20221021200844",
    organizationType: "Service interarmées à compétence nationale du ministère des Armées",
    organizationStatusJuridique: "Service interarmées à compétence nationale du ministère des Armées",
  },
  {
    clientId: "roc-seo-assistant-rh",
    title: "Assistant gestion du personnel, Réserviste (militaire du rang)",
    description: `<p>Réserviste administratif au profit du Service de l'Énergie Opérationnelle (SEO).</p>
<p>Rejoignez l'équipe de l'État-Major du SEO, et participez à la gestion du personnel de réserve du service. Que vous soyez étudiant·e, salarié·e ou en recherche d'emploi, l'engagement s'adapte à votre rythme, sans quitter votre vie. Ce n'est pas un stage ni un week-end de cohésion : c'est un engagement réel, avec une unité, des missions et une formation dès le premier jour. Et si vous êtes volontaire pour plus, participez concrètement à la défense du territoire.</p>
<p>En tant que réserviste :</p>
<ul>
<li>rejoignez l'équipe RH pour contribuer à la gestion de l'ensemble des réservistes du service ;</li>
<li>devenez technicien du système d'information Réserviste Opérationnel Connecté (ROC) du SEO ;</li>
<li>participez à la remontée des anomalies du système en production.</li>
</ul>
<p>Vous êtes formé·e et encadré·e à chaque étape, la formation initiale vous donne toutes les bases progressivement. Vous voulez en faire plus ? Sécurité d'installations militaires (missions de garde opérationnelles), Opération Sentinelle (protection des lieux publics, gares et frontières).</p>`,
    applicationUrl:
      "https://www.reservistes.defense.gouv.fr/lister-postes?filtres_liste_postes_form%5BniveauEtudesRequis%5D=&filtres_liste_postes_form%5Bgestionnaires%5D%5B%5D=302&filtres_liste_postes_form%5BdatePourvoiPoste%5D=&filtres_liste_postes_form%5BnbJoursActivites%5D%5Bvalue1%5D=0&filtres_liste_postes_form%5BnbJoursActivites%5D%5Bvalue2%5D=210&filtres_liste_postes_form%5Bpage%5D=1",
    image: "https://api-engagement-bucket.s3.fr-par.scw.cloud/publishers/65d7715cc0d3764cbed3afaf/AdobeStock%2015509515.jpeg",
    domain: "gestion-finance-droit",
    activities: ["gestion-ressources-humaines"],
    requirements: [
      "17 ans et +",
      "Bac",
      "Maîtrise bureautique",
      "Ouvert à toutes situations (étudiant·e, salarié·e, demandeur·euse d'emploi)",
      "Aptitude médicale requise",
      "Si possible, habiter en région Est (Nancy-Metz)",
    ],
    schedule: "Environ 50 jours par an. Contrat de 1 à 5 ans, renouvelable.",
    remote: "no",
    openToMinors: true,
    compensationAmount: 50,
    compensationAmountMax: 100,
    compensationUnit: "day",
    compensationType: "net",
    organizationName: "Service de l'Énergie Opérationnelle (SEO)",
    organizationUrl: "https://www.defense.gouv.fr/energie-ops",
    organizationDescription:
      "Le Service de l'énergie opérationnelle (SEO) est un service interarmées du ministère des Armées, garant de l'autonomie énergétique des forces armées françaises. Il assure l'approvisionnement, le stockage et la distribution des produits pétroliers nécessaires aux opérations militaires, en métropole, en zones de projection ou en opérations extérieures. Il conçoit, entretient et modernise les matériels pétroliers, définit les spécifications techniques et veille à la conformité réglementaire (transport de matières dangereuses, installations classées, sécurité). Son action s'étend au-delà du strict champ militaire : gendarmerie nationale et sécurité civile bénéficient également de son soutien.",
    organizationLogo:
      "https://thumb.wikimedia.org/wikipedia/commons/thumb/9/93/Logo_SEO.png/960px-Logo_SEO.png?utm_source=commons.wikimedia.org&utm_campaign=index&utm_content=thumbnail&_=20221021200844",
    organizationType: "Service interarmées à compétence nationale du ministère des Armées",
    organizationStatusJuridique: "Service interarmées à compétence nationale du ministère des Armées",
  },
  {
    clientId: "roc-marine-fusiliers-marins",
    title: "Réserviste dans la marine nationale au sein d'un bataillon de fusiliers marins",
    description: `<p>Mission : participer à la protection du territoire national.</p>
<p>Selon vos disponibilités, rejoignez une unité de la Marine Nationale et participez concrètement à la défense du territoire au sein d'un bataillon de fusiliers marins. Que vous soyez étudiant·e, salarié·e ou en recherche d'emploi, l'engagement s'adapte à votre rythme. C'est un engagement réel, au sein d'une unité qui vous permettra de valoriser cette expérience. Vous serez ainsi formé et accompagné à chaque étape.</p>
<p>En tant que réserviste, vous participerez à :</p>
<ul>
<li>la protection des emprises militaires et points d'intérêt vitaux ;</li>
<li>la sécurité et la sûreté d'installations militaires (missions de garde opérationnelles) ;</li>
<li>garantir l'intégrité des biens et des personnes.</li>
</ul>
<p>Plus de 100 postes sont ouverts actuellement. Certaines unités recrutent immédiatement.</p>`,
    applicationUrl:
      "https://www.reservistes.defense.gouv.fr/lister-postes?filtres_liste_postes_form%5BniveauEtudesRequis%5D=&filtres_liste_postes_form%5Bgestionnaires%5D%5B%5D=302&filtres_liste_postes_form%5BdatePourvoiPoste%5D=&filtres_liste_postes_form%5BnbJoursActivites%5D%5Bvalue1%5D=0&filtres_liste_postes_form%5BnbJoursActivites%5D%5Bvalue2%5D=210&filtres_liste_postes_form%5Bpage%5D=1",
    domain: "service-public-defense-securite",
    activities: ["prevention-protection"],
    requirements: [
      "17 ans et +",
      "Accessible sans condition de diplôme (pour de nombreux postes)",
      "Ouvert à toutes situations (étudiant·e, salarié·e, demandeur·euse d'emploi)",
      "Aptitude médicale requise",
    ],
    schedule: "Dès 30 jours par an. Contrat de 1 à 5 ans, renouvelable.",
    remote: "local",
    openToMinors: true,
    compensationAmount: 50,
    compensationAmountMax: 100,
    compensationUnit: "day",
    compensationType: "net",
    organizationName: "Marine Nationale",
    organizationUrl: "https://www.defense.gouv.fr/marine",
    organizationDescription:
      "La Marine nationale est l'une des armées françaises, forte de plus de 40 000 marins, qui opère sur toutes les mers et tous les océans, 365 jours par an. Elle assure la défense maritime du territoire et l'action de l'État en mer : protection des approches maritimes et des intérêts nationaux, dissuasion nucléaire (à travers la Force océanique stratégique), projection de forces, sauvegarde maritime, sécurité environnementale et sauvetage en mer.",
    organizationLogo:
      "https://thumb.wikimedia.org/wikipedia/commons/thumb/b/b8/LOGO_MARINE_NATIONALE_2021.svg/langfr-960px-LOGO_MARINE_NATIONALE_2021.svg.png?utm_source=fr.wikipedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    organizationType:
      "Armée - composante des forces armées françaises, régie par le Code de la défense (Livre II, art. L3211-1 et s. ; organisation de la marine nationale : art. R3223-1 à R3223-61), sous l'autorité du chef d'état-major de la marine, subordonné au chef d'état-major des armées et au ministre des Armées",
    organizationStatusJuridique:
      "Armée - composante des forces armées françaises, régie par le Code de la défense (Livre II, art. L3211-1 et s. ; organisation de la marine nationale : art. R3223-1 à R3223-61), sous l'autorité du chef d'état-major de la marine, subordonné au chef d'état-major des armées et au ministre des Armées",
  },
  {
    clientId: "roc-marine-semaphore",
    title: "Réserviste Sémaphore - Marine nationale",
    image: "https://api-engagement-bucket.s3.fr-par.scw.cloud/publishers/65d7715cc0d3764cbed3afaf/AdobeStock%20712216732.jpeg",
    description: `<p>Protection des approches maritimes.</p>
<p>Selon vos disponibilités, rejoignez une unité de la Marine Nationale et participez concrètement à la protection des approches maritimes au sein d'un sémaphore. Que vous soyez étudiant·e, salarié·e ou en recherche d'emploi, l'engagement s'adapte à votre rythme. C'est un engagement réel, au sein d'une unité, qui vous permettra de valoriser cette expérience. Vous serez ainsi formé et accompagné à chaque étape.</p>
<p>En tant que réserviste, vous participerez à :</p>
<ul>
<li>la protection des approches maritimes au sein d'un sémaphore ;</li>
<li>renforcer la veille opérationnelle sous la responsabilité d'un chef de quart ;</li>
<li>contacter les mobiles maritimes (bateaux, vedettes, embarcations…) en approche de nos côtes ;</li>
<li>assurer la surveillance visuelle et radar de l'environnement ;</li>
<li>alerter en cas de situation anormale ou dangereuse.</li>
</ul>
<p>Plus de 100 postes sont ouverts actuellement. Certaines unités recrutent immédiatement.</p>`,
    applicationUrl:
      "https://www.reservistes.defense.gouv.fr/lister-postes?filtres_liste_postes_form%5BniveauEtudesRequis%5D=&filtres_liste_postes_form%5Bgestionnaires%5D%5B%5D=302&filtres_liste_postes_form%5BdatePourvoiPoste%5D=&filtres_liste_postes_form%5BnbJoursActivites%5D%5Bvalue1%5D=0&filtres_liste_postes_form%5BnbJoursActivites%5D%5Bvalue2%5D=210&filtres_liste_postes_form%5Bpage%5D=1",
    domain: "service-public-defense-securite",
    activities: ["prevention-protection"],
    requirements: [
      "17 ans et +",
      "Aucun diplôme requis pour la plupart des postes, accessible sans condition de diplôme (pour de nombreux postes)",
      "Ouvert à toutes situations (étudiant·e, salarié·e, demandeur·euse d'emploi)",
      "Aptitude médicale requise",
    ],
    schedule: "Dès 30 jours par an. Contrat de 1 à 5 ans, renouvelable.",
    remote: "local",
    openToMinors: true,
    compensationAmount: 50,
    compensationAmountMax: 100,
    compensationUnit: "day",
    compensationType: "net",
    organizationName: "Marine Nationale",
    organizationUrl: "https://www.defense.gouv.fr/marine",
    organizationDescription:
      "La Marine nationale est l'une des armées françaises, forte de plus de 40 000 marins, qui opère sur toutes les mers et tous les océans, 365 jours par an. Elle assure la défense maritime du territoire et l'action de l'État en mer : protection des approches maritimes et des intérêts nationaux, dissuasion nucléaire (à travers la Force océanique stratégique), projection de forces, sauvegarde maritime, sécurité environnementale et sauvetage en mer.",
    organizationLogo:
      "https://thumb.wikimedia.org/wikipedia/commons/thumb/b/b8/LOGO_MARINE_NATIONALE_2021.svg/langfr-960px-LOGO_MARINE_NATIONALE_2021.svg.png?utm_source=fr.wikipedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
    organizationType:
      "Armée - composante des forces armées françaises, régie par le Code de la défense (Livre II, art. L3211-1 et s. ; organisation de la marine nationale : art. R3223-1 à R3223-61), sous l'autorité du chef d'état-major de la marine, subordonné au chef d'état-major des armées et au ministre des Armées",
    organizationStatusJuridique:
      "Armée - composante des forces armées françaises, régie par le Code de la défense (Livre II, art. L3211-1 et s. ; organisation de la marine nationale : art. R3223-1 à R3223-61), sous l'autorité du chef d'état-major de la marine, subordonné au chef d'état-major des armées et au ministre des Armées",
  },
];
