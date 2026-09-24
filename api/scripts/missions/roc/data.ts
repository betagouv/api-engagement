/**
 * Offres Réserve Opérationnelle des Armées (ROC).
 *
 * Un seul publisher annonceur (ROC) porte les offres ; chaque offre a un
 * `clientId` distinct. Les champs `type` et `postedAt` sont ajoutés par le
 * script au moment de l'envoi.
 */

export const ROC_TYPE = "volontariat_reserve_operationnelle" as const;

// Visuel générique partagé par toutes les offres ROC (hébergé sur le bucket du publisher).
export const ROC_IMAGE = "https://api-engagement-bucket.s3.fr-par.scw.cloud/publishers/65d7715cc0d3764cbed3afaf/generique.jpeg";

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
</ul>
<p>Activités de septembre à juin, principalement le mercredi après-midi, ainsi que d'autres journées pour l'organisation et le suivi administratif. Contrat de 3 ans souhaité.</p>`,
    applicationUrl:
      "https://www.reservistes.defense.gouv.fr/lister-postes?filtres_liste_postes_form%5BniveauEtudesRequis%5D=&filtres_liste_postes_form%5Bgestionnaires%5D%5B%5D=304&filtres_liste_postes_form%5BdatePourvoiPoste%5D=&filtres_liste_postes_form%5BnbJoursActivites%5D%5Bvalue1%5D=0&filtres_liste_postes_form%5BnbJoursActivites%5D%5Bvalue2%5D=210&filtres_liste_postes_form%5Bpage%5D=1",
    image: ROC_IMAGE,
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
    schedule: "Mercredi après-midi. 60 jours/an.",
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
</ul>
<p>Contrat de 3 ans souhaité.</p>`,
    applicationUrl:
      "https://www.reservistes.defense.gouv.fr/lister-postes?filtres_liste_postes_form%5BniveauEtudesRequis%5D=&filtres_liste_postes_form%5Bgestionnaires%5D%5B%5D=304&filtres_liste_postes_form%5BdatePourvoiPoste%5D=&filtres_liste_postes_form%5BnbJoursActivites%5D%5Bvalue1%5D=0&filtres_liste_postes_form%5BnbJoursActivites%5D%5Bvalue2%5D=210&filtres_liste_postes_form%5Bpage%5D=1",
    image: ROC_IMAGE,
    domain: "service-public-defense-securite",
    activities: ["operations-militaires"],
    requirements: [
      "Diplôme requis : Certificat d'Aptitude à l'emploi de réserviste (CAER) - formation interne",
      "Formation militaire initiale du réserviste (FMIR) - formation interne",
      "Formation militaire complémentaire de réserve (FMCR) - formation interne",
    ],
    softSkills: ["Capacité d'adaptation", "Rigueur", "Dynamisme", "Esprit d'équipe", "Motivation", "Disponibilité"],
    schedule: "60 jours d'activité par an. Selon disponibilité du réserviste et des besoins de l'employeur.",
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
    clientId: "roc-jdc-animateur-accompagnateur",
    title: "Animateur - Accompagnateur JDC",
    description: `<p>Officier / sous-officier de réserve (SGT à CNE), chargé d'animer les différents ateliers de la Journée Défense et Citoyenneté (JDC).</p>
<h3>Vos missions</h3>
<ul>
<li>Accompagner et guider un groupe de jeunes toute la journée.</li>
<li>Répondre aux questions des jeunes portant sur les métiers des armées, direction et services et culture militaire.</li>
<li>Co-animer des ateliers thématiques tels que tir sportif laser, atelier de réalité virtuelle et jeu de rôle « STRAT&amp;J ».</li>
<li>Contribuer à la logistique nécessaire au bon déroulement de la journée.</li>
</ul>
<p>Contrat de 1 à 5 ans souhaité.</p>`,
    applicationUrl:
      "https://www.reservistes.defense.gouv.fr/lister-postes?filtres_liste_postes_form%5BniveauEtudesRequis%5D=&filtres_liste_postes_form%5Bgestionnaires%5D%5B%5D=304&filtres_liste_postes_form%5BdatePourvoiPoste%5D=&filtres_liste_postes_form%5BnbJoursActivites%5D%5Bvalue1%5D=0&filtres_liste_postes_form%5BnbJoursActivites%5D%5Bvalue2%5D=210&filtres_liste_postes_form%5Bpage%5D=1",
    image: ROC_IMAGE,
    domain: "memoire-et-citoyennete",
    activities: ["enseignement-formation"],
    requirements: ["Aucun diplôme requis", "Aucune formation exigée"],
    softSkills: ["Savoir-être", "Sens pédagogique", "Communication", "Goût du contact", "Connaissance du milieu militaire"],
    schedule: "30 jours d'activité par an. Selon disponibilité du réserviste et des besoins de l'employeur.",
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
    clientId: "roc-seo-architecte-donnees-reserviste",
    title: "Architecte de données, Réserviste Spécialiste",
    description: `<p>Réserviste au profit du Service de l'Énergie Opérationnelle et de son système d'information Réserviste Opérationnel Connecté (ROC).</p>
<p>Rejoignez l'équipe de l'État-Major des Armées et du Service de l'Énergie Opérationnelle, et participez au développement du système d'information ROC. Que vous soyez étudiant, salarié ou en recherche d'emploi, l'engagement s'adapte à votre rythme, sans quitter votre vie. Ce n'est pas un stage ni un week-end de cohésion : c'est un engagement réel, avec une unité, des missions et une formation dès le premier jour.</p>
<p>En tant que réserviste :</p>
<ul>
<li>travaillez en équipe pour participer au développement du SI ROC ;</li>
<li>participez à l'élaboration de la stratégie de recette, à l'écriture des cahiers de recette et à la recette du système d'information sur l'environnement de développement (PICSEL) et de pré-production ;</li>
<li>contribuez à la remontée au SI ROC des anomalies du système en production.</li>
</ul>
<p>Vous êtes formé et encadré à chaque étape, la formation initiale vous donne toutes les bases progressivement.</p>
<h3>Indemnisations complémentaires</h3>
<ul>
<li>🎯 Prime de fidélité : 250 € par an dès le 2e contrat (si minimum 37 jours par an).</li>
<li>🎓 Allocation mensuelle de 100 € pour les étudiants de moins de 25 ans (si contrat 5 ans, et minimum 37 j/an).</li>
<li>🚗 Financement du permis B jusqu'à 1 000 € pour les moins de 25 ans (50 jours de service effectués).</li>
</ul>`,
    applicationUrl:
      "https://www.reservistes.defense.gouv.fr/lister-postes?filtres_liste_postes_form%5BniveauEtudesRequis%5D=&filtres_liste_postes_form%5Bgestionnaires%5D%5B%5D=309&filtres_liste_postes_form%5BdatePourvoiPoste%5D=&filtres_liste_postes_form%5BnbJoursActivites%5D%5Bvalue1%5D=0&filtres_liste_postes_form%5BnbJoursActivites%5D%5Bvalue2%5D=210&filtres_liste_postes_form%5Bpage%5D=1",
    image: ROC_IMAGE,
    domain: "numerique",
    activities: ["informatique"],
    requirements: [
      "17 ans et +",
      "Bac +2",
      "Connaissances bureautiques et maîtrise informatique (PICSEL, JIRA)",
      "Ouvert à toutes situations (étudiant, salarié, demandeur d'emploi)",
      "Aptitude médicale requise",
      "Habiter en région parisienne",
    ],
    schedule: "Environ 50 jours par an. Contrat de 1 à 5 ans, renouvelable.",
    remote: "local",
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
    clientId: "roc-seo-assistant-rh",
    title: "Assistant gestion du personnel, Réserviste (militaire du rang)",
    description: `<p>Réserviste administratif au profit du Service de l'Énergie Opérationnelle (SEO).</p>
<p>Rejoignez l'équipe de l'État-Major du SEO, et participez à la gestion du personnel de réserve du service. Que vous soyez étudiant, salarié ou en recherche d'emploi, l'engagement s'adapte à votre rythme, sans quitter votre vie. Ce n'est pas un stage ni un week-end de cohésion : c'est un engagement réel, avec une unité, des missions et une formation dès le premier jour. Et si vous êtes volontaire pour plus, participez concrètement à la défense du territoire.</p>
<p>En tant que réserviste :</p>
<ul>
<li>rejoignez l'équipe RH pour contribuer à la gestion de l'ensemble des réservistes du service ;</li>
<li>devenez technicien du système d'information Réserviste Opérationnel Connecté (ROC) du SEO ;</li>
<li>participez à la remontée des anomalies du système en production.</li>
</ul>
<p>Vous êtes formé et encadré à chaque étape, la formation initiale vous donne toutes les bases progressivement. Vous voulez en faire plus ? Sécurité d'installations militaires (missions de garde opérationnelles), Opération Sentinelle (protection des lieux publics, gares et frontières).</p>`,
    applicationUrl:
      "https://www.reservistes.defense.gouv.fr/lister-postes?filtres_liste_postes_form%5BniveauEtudesRequis%5D=&filtres_liste_postes_form%5Bgestionnaires%5D%5B%5D=309&filtres_liste_postes_form%5BdatePourvoiPoste%5D=&filtres_liste_postes_form%5BnbJoursActivites%5D%5Bvalue1%5D=0&filtres_liste_postes_form%5BnbJoursActivites%5D%5Bvalue2%5D=210&filtres_liste_postes_form%5Bpage%5D=1",
    image: ROC_IMAGE,
    domain: "gestion-finance-droit",
    activities: ["gestion-ressources-humaines"],
    requirements: [
      "17 ans et +",
      "Bac",
      "Maîtrise bureautique",
      "Ouvert à toutes situations (étudiant, salarié, demandeur d'emploi)",
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
<p>Selon vos disponibilités, rejoignez une unité de la Marine Nationale et participez concrètement à la défense du territoire au sein d'un bataillon de fusiliers marins. Que vous soyez étudiant, salarié ou en recherche d'emploi, l'engagement s'adapte à votre rythme. C'est un engagement réel, au sein d'une unité qui vous permettra de valoriser cette expérience. Vous serez ainsi formé et accompagné à chaque étape.</p>
<p>En tant que réserviste, vous participerez à :</p>
<ul>
<li>la protection des emprises militaires et points d'intérêt vitaux ;</li>
<li>la sécurité et la sûreté d'installations militaires (missions de garde opérationnelles) ;</li>
<li>garantir l'intégrité des biens et des personnes.</li>
</ul>
<p>Plus de 100 postes sont ouverts actuellement. Certaines unités recrutent immédiatement.</p>`,
    applicationUrl:
      "https://www.reservistes.defense.gouv.fr/lister-postes?filtres_liste_postes_form%5BniveauEtudesRequis%5D=&filtres_liste_postes_form%5Bgestionnaires%5D%5B%5D=303&filtres_liste_postes_form%5BdatePourvoiPoste%5D=&filtres_liste_postes_form%5BnbJoursActivites%5D%5Bvalue1%5D=0&filtres_liste_postes_form%5BnbJoursActivites%5D%5Bvalue2%5D=210&filtres_liste_postes_form%5Bpage%5D=1",
    image: ROC_IMAGE,
    domain: "service-public-defense-securite",
    activities: ["prevention-protection"],
    requirements: [
      "17 ans et +",
      "Accessible sans condition de diplôme (pour de nombreux postes)",
      "Ouvert à toutes situations (étudiant, salarié, demandeur d'emploi)",
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
    image: ROC_IMAGE,
    description: `<p>Protection des approches maritimes.</p>
<p>Selon vos disponibilités, rejoignez une unité de la Marine Nationale et participez concrètement à la protection des approches maritimes au sein d'un sémaphore. Que vous soyez étudiant, salarié ou en recherche d'emploi, l'engagement s'adapte à votre rythme. C'est un engagement réel, au sein d'une unité, qui vous permettra de valoriser cette expérience. Vous serez ainsi formé et accompagné à chaque étape.</p>
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
      "https://www.reservistes.defense.gouv.fr/lister-postes?filtres_liste_postes_form%5BniveauEtudesRequis%5D=&filtres_liste_postes_form%5Bgestionnaires%5D%5B%5D=303&filtres_liste_postes_form%5BdatePourvoiPoste%5D=&filtres_liste_postes_form%5BnbJoursActivites%5D%5Bvalue1%5D=0&filtres_liste_postes_form%5BnbJoursActivites%5D%5Bvalue2%5D=210&filtres_liste_postes_form%5Bpage%5D=1",
    domain: "service-public-defense-securite",
    activities: ["prevention-protection"],
    requirements: [
      "17 ans et +",
      "Aucun diplôme requis pour la plupart des postes, accessible sans condition de diplôme (pour de nombreux postes)",
      "Ouvert à toutes situations (étudiant, salarié, demandeur d'emploi)",
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
    clientId: "roc-terre-c3t-combattant",
    title: "Réserviste dans l'armée de terre : combattant concept commun du combat terrestre (C3T)",
    description: `<p>Vous rejoignez une unité opérationnelle de l'Armée de Terre et participez concrètement à la défense du territoire. Que vous soyez étudiant, salarié ou en recherche d'emploi, l'engagement s'adapte à votre rythme, sans quitter votre vie. Ce n'est pas un stage ni un week-end de cohésion. C'est un engagement réel, avec une unité, des missions et une formation dès le premier jour.</p>
<p>En tant que réserviste combattant, de militaire du rang à sous-officier, vous participerez à :</p>
<ul>
<li>Opération Sentinelle (protection des lieux publics, gares et frontières) ;</li>
<li>exercices en unité (manœuvres, commandement, cohésion) ;</li>
<li>sécurité d'installations militaires (missions de garde opérationnelles).</li>
</ul>
<p>Selon votre profil : possibilité de missions à l'étranger. Vous êtes formé et encadré à chaque étape, la formation initiale vous donne toutes les bases progressivement.</p>
<p>Plus de 100 postes sont ouverts actuellement. Certaines unités recrutent immédiatement.</p>
<h3>Indemnisations complémentaires</h3>
<ul>
<li>🎯 Prime de fidélité : 250 € par an dès le 2e contrat (si 37 jours par an).</li>
<li>🎓 Allocation mensuelle de 100 € pour les étudiants de moins de 25 ans (contrat 5 ans, 37 j/an).</li>
<li>🚗 Financement du permis B jusqu'à 1 000 € pour les moins de 25 ans (50 jours de service effectués).</li>
</ul>`,
    applicationUrl:
      "https://www.reservistes.defense.gouv.fr/lister-postes?filtres_liste_postes_form%5BniveauEtudesRequis%5D=&filtres_liste_postes_form%5Bgestionnaires%5D%5B%5D=302&filtres_liste_postes_form%5BdatePourvoiPoste%5D=&filtres_liste_postes_form%5BnbJoursActivites%5D%5Bvalue1%5D=0&filtres_liste_postes_form%5BnbJoursActivites%5D%5Bvalue2%5D=210&filtres_liste_postes_form%5Bpage%5D=1",
    image: ROC_IMAGE,
    domain: "service-public-defense-securite",
    activities: ["operations-militaires"],
    requirements: ["17 ans et +", "Aucun diplôme requis pour la plupart des postes ; toutes situations (étudiant, salarié, demandeur d'emploi)", "Aptitude médicale requise"],
    schedule: "Environ 46 jours par an. Contrat de 1 à 5 ans, renouvelable.",
    remote: "local",
    openToMinors: true,
    compensationAmount: 50,
    compensationAmountMax: 100,
    compensationUnit: "day",
    compensationType: "net",
    organizationName: "Armée de Terre",
    organizationUrl: "https://www.defense.gouv.fr/terre",
    organizationDescription:
      "L'armée de Terre est l'une des composantes des forces armées françaises, forte de plus de 120 000 femmes et hommes, militaires et civils de la défense. Présente sur le territoire national et à l'étranger, elle est engagée sur trois missions : protéger la France et les Français sur le territoire national, renforcer la solidarité stratégique entre alliés en Europe et au Moyen-Orient, et nouer des partenariats de l'Afrique à l'Indopacifique. Elle mobilise en permanence près de 30 000 soldats en posture opérationnelle, en coordination avec la Marine nationale, l'Armée de l'Air et de l'Espace et la Gendarmerie nationale.",
    organizationLogo: "https://upload.wikimedia.org/wikipedia/commons/5/50/Logo_of_the_French_Army_(Armee_de_Terre).svg",
    organizationType: "Armée - composante des forces armées françaises",
    organizationStatusJuridique: "Armée - composante des forces armées françaises",
  },
  {
    clientId: "roc-terre-etat-major-redacteur",
    title: "Réserviste dans l'armée de terre : rédacteur et traitant en état-major",
    image: ROC_IMAGE,
    description: `<p>Vous rejoignez un état-major de l'Armée de Terre et participez concrètement à la défense du territoire. Que vous soyez étudiant, salarié ou en recherche d'emploi, l'engagement s'adapte à votre rythme, sans quitter votre vie. Ce n'est pas un stage ni un week-end de cohésion. C'est un engagement réel, avec une unité, des missions et une formation dès le premier jour.</p>
<p>En tant que réserviste, de sous-officier à officier, vous devrez :</p>
<ul>
<li>agir collectivement et de façon coordonnée pour atteindre un objectif commun ;</li>
<li>mener des actions de manière indépendante dans le cadre de vos responsabilités ;</li>
<li>répondre personnellement des actions relevant de vos attributions et en assumer les conséquences ;</li>
<li>vous adapter à votre environnement de travail, à des situations variées ;</li>
<li>et ajuster vos comportements en fonction des enjeux de la situation.</li>
</ul>
<p>Selon votre profil : possibilité de missions à l'étranger. Vous êtes formé et encadré à chaque étape.</p>
<p>Plus de 100 postes sont ouverts actuellement. Certaines unités recrutent immédiatement.</p>
<p>Bac requis.</p>
<h3>Indemnisations complémentaires</h3>
<ul>
<li>🎯 Prime de fidélité : 250 € par an dès le 2e contrat (si 37 jours par an).</li>
<li>🎓 Allocation mensuelle de 100 € pour les étudiants de moins de 25 ans (contrat 5 ans, 37 j/an).</li>
<li>🚗 Financement du permis B jusqu'à 1 000 € pour les moins de 25 ans (50 jours de service effectués).</li>
</ul>`,
    applicationUrl:
      "https://www.reservistes.defense.gouv.fr/lister-postes?filtres_liste_postes_form%5BniveauEtudesRequis%5D=&filtres_liste_postes_form%5Bgestionnaires%5D%5B%5D=302&filtres_liste_postes_form%5BdatePourvoiPoste%5D=&filtres_liste_postes_form%5BnbJoursActivites%5D%5Bvalue1%5D=0&filtres_liste_postes_form%5BnbJoursActivites%5D%5Bvalue2%5D=210&filtres_liste_postes_form%5Bpage%5D=1",
    domain: "service-public-defense-securite",
    activities: ["taches-administratives"],
    requirements: ["17 ans et +", "BAC requis", "Toutes situations (étudiant, salarié, demandeur d'emploi)", "Aptitude médicale requise"],
    schedule: "Environ 46 jours par an. Contrat de 1 à 5 ans, renouvelable.",
    remote: "local",
    openToMinors: true,
    compensationAmount: 50,
    compensationAmountMax: 100,
    compensationUnit: "day",
    compensationType: "net",
    organizationName: "Armée de Terre",
    organizationUrl: "https://www.defense.gouv.fr/terre",
    organizationDescription:
      "L'armée de Terre est l'une des composantes des forces armées françaises, forte de plus de 120 000 femmes et hommes, militaires et civils de la défense. Présente sur le territoire national et à l'étranger, elle est engagée sur trois missions : protéger la France et les Français sur le territoire national, renforcer la solidarité stratégique entre alliés en Europe et au Moyen-Orient, et nouer des partenariats de l'Afrique à l'Indopacifique. Elle mobilise en permanence près de 30 000 soldats en posture opérationnelle, en coordination avec la Marine nationale, l'Armée de l'Air et de l'Espace et la Gendarmerie nationale.",
    organizationLogo: "https://upload.wikimedia.org/wikipedia/commons/5/50/Logo_of_the_French_Army_(Armee_de_Terre).svg",
    organizationType: "Armée - composante des forces armées françaises",
    organizationStatusJuridique: "Armée - composante des forces armées françaises",
  },
];
