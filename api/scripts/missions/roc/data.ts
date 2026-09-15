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
    image: "https://devenir-aviateur.gouv.fr/uploads/media/1920x/06/2256-desktop%20banni%C3%A8re%20haut.webp?v=1-0",
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
    image: "https://devenir-aviateur.gouv.fr/uploads/media/1920x/06/2256-desktop%20banni%C3%A8re%20haut.webp?v=1-0",
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
    image: "https://devenir-aviateur.gouv.fr/uploads/media/1920x/06/2256-desktop%20banni%C3%A8re%20haut.webp?v=1-0",
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
];
