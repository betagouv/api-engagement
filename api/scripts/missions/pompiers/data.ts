export interface SdisEntry {
  dept: string;
  organizationName: string;
  applicationUrl: string;
  organizationUrl: string;
}

// BSPP (75, 92, 93, 94) exclus — brigade militaire, hors périmètre SDIS
// SDIS sans URL de candidature exclus : 15 (pas de site), 56 (serveur crash), 90 (site en maintenance)
export const SDIS_DATA: SdisEntry[] = [
  {
    dept: "01",
    organizationName: "SDIS de l'Ain",
    applicationUrl: "https://www.sdis01.fr/index.php?option=com_content&view=article&id=55&Itemid=252",
    organizationUrl: "https://www.sdis01.fr/",
  },
  {
    dept: "02",
    organizationName: "SDIS de l'Aisne",
    applicationUrl: "http://www.sdis02.fr/sdis_02_web/fr/Accueil.awp?page=24&m=9.17",
    organizationUrl: "http://www.sdis02.fr/sdis_02_web/fr/Accueil.awp?page=24&m=9.17",
  },
  {
    dept: "03",
    organizationName: "SDIS de l'Allier",
    applicationUrl: "https://www.sdis03.com/devenir-sapeur-pompier-volontaire/#contact",
    organizationUrl: "https://www.sdis03.com/",
  },
  {
    dept: "04",
    organizationName: "SDIS Alpes de Haute Provence",
    applicationUrl: "https://www.sdis04.fr/devenir-sapeur-pompier/sapeur-pompier-volontaire/",
    organizationUrl: "https://www.sdis04.fr/organisation-territ/centres-de-secours/la-javie/",
  },
  {
    dept: "05",
    organizationName: "SDIS des Hautes Alpes",
    applicationUrl: "https://www.sdis05.fr/57-les-sapeurs-pompiers-volontaires.htm",
    organizationUrl: "https://www.sdis05.fr/",
  },
  {
    dept: "06",
    organizationName: "SDIS des Alpes Maritimes",
    applicationUrl: "https://www.sdis06.fr/jcms/dsdis_6743/devenir-sapeur-pompier-volontaire",
    organizationUrl: "https://www.sdis06.fr/jcms/dsdis_6743/devenir-sapeur-pompier-volontaire",
  },
  {
    dept: "07",
    organizationName: "SDIS de l'Ardèche",
    applicationUrl: "https://forms.office.com/pages/responsepage.aspx?id=D6Dvpnxt4UesfqgKiNpC7EF74zw0m9JBml5hLeHPkDNUMFcwUDJKTTNVSFJVMDZFWDNUTURaRFkxUS4u&route=shorturl",
    organizationUrl: "https://www.sdis07.fr/",
  },
  {
    dept: "08",
    organizationName: "SDIS Ardennes",
    applicationUrl: "https://www.sdis08.com/corps-de-metier/devenir-sapeur-pompier-volontaire",
    organizationUrl: "https://www.sdis08.com/corps-de-metier/devenir-sapeur-pompier-volontaire",
  },
  { dept: "09", organizationName: "SDIS de l'Ariège", applicationUrl: "https://sdis09.com/recrutement/", organizationUrl: "https://sdis09.com/" },
  {
    dept: "10",
    organizationName: "SDIS de l'Aube",
    applicationUrl: "https://www.sdis10.com/accueil/rejoignez-nous/fomulaire-spv/",
    organizationUrl: "https://www.sdis10.com/accueil/rejoignez-nous/",
  },
  { dept: "11", organizationName: "SDIS de l'Aude", applicationUrl: "https://sdis11.fr/volontariat/", organizationUrl: "https://sdis11.fr/devenir-sp-volontaire/" },
  {
    dept: "12",
    organizationName: "SDIS de l'Aveyron",
    applicationUrl: "https://www.sdis12.fr/fr/rejoignez-nous/sapeur-pompier-volontaire.php",
    organizationUrl: "https://www.sdis12.fr/fr/rejoignez-nous/sapeur-pompier-volontaire.php",
  },
  {
    dept: "13",
    organizationName: "SDIS des Bouches du Rhône",
    applicationUrl: "https://pompiers13.org/devenir-spv/#formspv",
    organizationUrl: "https://pompiers13.org/engagement/spv/",
  },
  {
    dept: "14",
    organizationName: "SDIS du Calvados",
    applicationUrl: "https://www.sdis14.fr/accueil/nous-rejoindre/devenir-sapeur-pompier-volontair.html",
    organizationUrl: "https://www.sdis14.fr/accueil.html",
  },
  {
    dept: "16",
    organizationName: "SDIS de la Charente",
    applicationUrl: "https://www.pompiers-charente.org/index-module-orki-page-view-id-67.html",
    organizationUrl: "https://www.pompiers-charente.org/index-module-orki-page-view-id-67.html",
  },
  {
    dept: "17",
    organizationName: "SDIS de Charente Maritime",
    applicationUrl: "https://www.demarches-simplifiees.fr/commencer/fml-prh-052",
    organizationUrl: "https://sdis17.fr/candidature/",
  },
  {
    dept: "18",
    organizationName: "SDIS du Cher",
    applicationUrl: "https://demarche.numerique.gouv.fr/commencer/devenir_pompiers18",
    organizationUrl: "https://pompiers18.fr/elementor-384/",
  },
  {
    dept: "19",
    organizationName: "SDIS de la Corrèze",
    applicationUrl: "https://demarche.numerique.gouv.fr/commencer/candidature-sapeur-pompier-volontaire-sdis-19",
    organizationUrl: "https://www.sdis-19.com/devenir-sapeur-pompier-volontaire/comment-devenir-sapeur-pompier-volontaire/",
  },
  { dept: "2A", organizationName: "SIS de Corse du Sud", applicationUrl: "https://www.sis2a.corsica/candidature-spv/", organizationUrl: "https://www.sis2a.corsica/" },
  {
    dept: "2B",
    organizationName: "SIS de Haute Corse",
    applicationUrl: "https://sis2b.corsica/nous-rejoindre/devenir-sapeur-pompier-volontaire/candidature-spv/",
    organizationUrl: "https://sis2b.corsica/",
  },
  {
    dept: "21",
    organizationName: "SDIS de la Côte d'Or",
    applicationUrl: "https://www.sdis21.org/index.php/recrutement/sapeur-pompier-volontaire/",
    organizationUrl: "https://www.sdis21.org/",
  },
  {
    dept: "22",
    organizationName: "SDIS des Côtes d'Armor",
    applicationUrl: "https://www.sdis22.fr/nous-rejoindre/sapeur-pompier-volontaire/",
    organizationUrl: "https://www.sdis22.fr/nous-rejoindre/sapeur-pompier-volontaire/",
  },
  {
    dept: "23",
    organizationName: "SDIS de la Creuse",
    applicationUrl: "https://www.sdis23.fr/portfolio/devenir-sapeur-pompier-volontaire/",
    organizationUrl: "https://www.sdis23.fr/portfolio/devenir-sapeur-pompier-volontaire/",
  },
  {
    dept: "24",
    organizationName: "SDIS de la Dordogne",
    applicationUrl: "https://www.sdis24.fr/formulaire-de-recrutement-sapeur-pompier-volontaire/",
    organizationUrl: "https://www.sdis24.fr/",
  },
  {
    dept: "25",
    organizationName: "SDIS du Doubs",
    applicationUrl: "https://www.sdis25.fr/devenir-sapeur-pompier/devenir-sapeur-pompier-volontaire/",
    organizationUrl: "https://www.sdis25.fr/",
  },
  {
    dept: "26",
    organizationName: "SDIS de la Drôme",
    applicationUrl: "https://www.pompiers26.com/formulaire-devenir-sapeur-pompier-vol",
    organizationUrl: "https://www.pompiers26.com/sdis26",
  },
  {
    dept: "27",
    organizationName: "SDIS de l'Eure",
    applicationUrl: "https://www.sapeurspompiers27.fr/lengagement-pluriel/sapeurs-pompiers-volontaires/un-engagement-pour-tous/",
    organizationUrl: "https://www.sapeurspompiers27.fr/",
  },
  { dept: "28", organizationName: "SDIS de l'Eure et Loire", applicationUrl: "https://www.sdis28.fr/spip.php?rubrique39", organizationUrl: "https://www.sdis28.fr/" },
  {
    dept: "29",
    organizationName: "SDIS du Finistère",
    applicationUrl: "http://www.sdis29.fr/devenir-sapeur-pompier/sapeur-pompier-volontaire/les-candidatures.html#formaulaire",
    organizationUrl: "http://www.sdis29.fr/devenir-sapeur-pompier/sapeur-pompier-volontaire/les-candidatures.html",
  },
  {
    dept: "30",
    organizationName: "SDIS du Gard",
    applicationUrl: "https://www.sdis30.fr/Pages/SAPEUR-POMPIER-VOLONTAIRE.aspx",
    organizationUrl: "http://www.sdis30.fr/Pages/System/default.aspx",
  },
  {
    dept: "31",
    organizationName: "SDIS de la Haute Garonne",
    applicationUrl: "https://www.sdis31.fr/rejoignez-nous/sapeur-pompier-volontaire/procedure-de-candidature-2/",
    organizationUrl: "https://www.sdis31.fr/rejoignez-nous/",
  },
  {
    dept: "32",
    organizationName: "SDIS du Gers",
    applicationUrl: "https://www.sdis32.fr/devenez-sapeur-pompier-volontaire-toutes-missions/",
    organizationUrl: "https://www.sdis32.fr/devenez-sapeur-pompier-volontaire-toutes-missions/",
  },
  {
    dept: "33",
    organizationName: "SDIS de Gironde",
    applicationUrl: "https://demarche.numerique.gouv.fr/commencer/candidature-sapeur-pompier-volontaire-en-gironde-2",
    organizationUrl: "https://www.pompiers33.fr/",
  },
  { dept: "34", organizationName: "SDIS de l'Hérault", applicationUrl: "https://www.sdis34.fr/formulaire-devenir-spv/", organizationUrl: "https://www.sdis34.fr/" },
  {
    dept: "35",
    organizationName: "SDIS Ille-et-Vilaine",
    applicationUrl: "https://sapeurs-pompiers35.fr/nous-rejoindre/devenir-sapeur-pompier-volontaire-2/",
    organizationUrl: "https://sapeurs-pompiers35.fr/",
  },
  {
    dept: "36",
    organizationName: "SDIS de l'Indre",
    applicationUrl: "https://www.sdis36.org/le-recrutement/devenir-sapeurs-pompiers-volontaires/",
    organizationUrl: "https://www.sdis36.org/",
  },
  { dept: "37", organizationName: "SDIS de l'Indre-et-Loire", applicationUrl: "https://www.sdis37.fr/sapeur-pompier-volontaire/", organizationUrl: "https://www.sdis37.fr/" },
  { dept: "38", organizationName: "SDIS de l'Isère", applicationUrl: "https://www.sdis38.fr/30-sapeur-pompier-volontaire.htm", organizationUrl: "https://www.sdis38.fr/" },
  {
    dept: "39",
    organizationName: "SDIS du Jura",
    applicationUrl: "https://www.jurapompiers.fr/devenez-sapeur-pompier-volontaire#overlay-context=devenez-sapeur-pompier-volontaire",
    organizationUrl: "https://www.jurapompiers.fr/",
  },
  { dept: "40", organizationName: "SDIS des Landes", applicationUrl: "https://www.sdis40.fr/?page_id=818", organizationUrl: "https://www.sdis40.fr/" },
  { dept: "41", organizationName: "SDIS Loir-et-Cher", applicationUrl: "https://www.sdis41.fr/offres-demplois/sengager/spv/", organizationUrl: "https://www.sdis41.fr/" },
  { dept: "42", organizationName: "SDIS de la Loire", applicationUrl: "https://www.sdis42.fr/sapeur-pompier-volontaire", organizationUrl: "https://www.sdis42.fr/" },
  { dept: "43", organizationName: "SDIS Haute Loire", applicationUrl: "https://www.sdis43.fr/devenir-sapeur-pompier-volontaire/", organizationUrl: "https://www.sdis43.fr/" },
  {
    dept: "44",
    organizationName: "SDIS de Loire Atlantique",
    applicationUrl: "https://www.sdis44.fr/nous-rejoindre/devenir-sapeur-pompier-volontaire/",
    organizationUrl: "https://www.sdis44.fr/",
  },
  { dept: "45", organizationName: "SDIS du Loiret", applicationUrl: "https://sdis45.com/sp-volontaires/", organizationUrl: "https://sdis45.com/" },
  {
    dept: "46",
    organizationName: "SDIS du Lot",
    applicationUrl: "https://www.pompiersdulot.fr/s-engager/devenir-sapeur-pompier-volontaire",
    organizationUrl: "https://www.pompiersdulot.fr/",
  },
  {
    dept: "47",
    organizationName: "SDIS du Lot-et-Garonne",
    applicationUrl: "https://www.sdis47.fr/devenez-sapeur-pompier-volontaire/deposer-une-demande-de-sapeur-pompier-volontaire/",
    organizationUrl: "https://www.sdis47.fr/",
  },
  { dept: "48", organizationName: "SDIS de la Lozère", applicationUrl: "https://www.sdis48.com/nous-rejoindre/", organizationUrl: "https://www.sdis48.com/" },
  {
    dept: "49",
    organizationName: "SDIS Maine et Loire",
    applicationUrl: "https://www.sdis49.fr/rejoignez-nous/sapeurs-pompiers-volontaires/",
    organizationUrl: "https://www.sdis49.fr/",
  },
  { dept: "50", organizationName: "SDIS de la Manche", applicationUrl: "https://www.sdis50.fr/sapeur-pompier-volontaire/", organizationUrl: "https://www.sdis50.fr/" },
  { dept: "51", organizationName: "SDIS de la Marne", applicationUrl: "https://www.sdis51.fr/sapeur-pompier-volontaire", organizationUrl: "https://www.sdis51.fr/" },
  { dept: "52", organizationName: "SDIS de la Haute-Marne", applicationUrl: "https://www.sdis52.fr/devenir-pompier/42-2/", organizationUrl: "https://www.sdis52.fr/" },
  {
    dept: "53",
    organizationName: "SDIS de la Mayenne",
    applicationUrl: "https://www.sdis53.fr/nous-rejoindre/devenir-sapeur-pompier-volontaire/",
    organizationUrl: "https://www.sdis53.fr/nous-rejoindre/devenir-sapeur-pompier-volontaire/",
  },
  {
    dept: "54",
    organizationName: "SDIS de Meurthe et Moselle",
    applicationUrl: "https://sdis54.fr/volontariat/sapeur-pompier-volontaire-pourquoi-pas-vous",
    organizationUrl: "https://sdis54.fr/",
  },
  { dept: "55", organizationName: "SDIS de la Meuse", applicationUrl: "https://form.jotform.com/253491862892369", organizationUrl: "https://www.pompiers55.fr/" },
  {
    dept: "57",
    organizationName: "SDIS de la Moselle",
    applicationUrl: "https://www.demarches-simplifiees.fr/commencer/formulaire-de-recrutement-sdis57",
    organizationUrl: "https://www.sdis57.fr/home/",
  },
  { dept: "58", organizationName: "SDIS de la Nièvre", applicationUrl: "https://sdis58.fr/formulaire-de-contact-spv/", organizationUrl: "https://sdis58.fr/" },
  {
    dept: "59",
    organizationName: "SDIS du Nord",
    applicationUrl: "https://www.sdis59.fr/sengager/sapeurs-pompiers-volontaires/formulaire-spv/",
    organizationUrl: "https://www.sdis59.fr/",
  },
  { dept: "60", organizationName: "SDIS de l'Oise", applicationUrl: "https://www.sdis60.fr/recrutement-spv/", organizationUrl: "https://www.sdis60.fr/" },
  { dept: "61", organizationName: "SDIS de l'Orne", applicationUrl: "https://www.sdis61.fr/rejoignez-sdis61/se-former-spv/", organizationUrl: "https://www.sdis61.fr/" },
  {
    dept: "62",
    organizationName: "SDIS du Pas-de-Calais",
    applicationUrl: "https://www.sdis62.fr/devenir-sapeur-pompier/devenir-sapeur-pompier-volontaire/",
    organizationUrl: "https://www.sdis62.fr/",
  },
  { dept: "63", organizationName: "SDIS du Puy de Dome", applicationUrl: "https://sdis63.lp-mediaposte.fr/#form", organizationUrl: "https://www.sdis63.fr/" },
  {
    dept: "64",
    organizationName: "SDIS des Pyrénées Atlantique",
    applicationUrl: "https://www.sdis64.fr/nous-rejoindre/devenir-sapeurs-pompiers-volontaires/",
    organizationUrl: "https://www.sdis64.fr/",
  },
  {
    dept: "65",
    organizationName: "SDIS des Hautes Pyrénées",
    applicationUrl: "https://sapeurs-pompiers65.fr/rejoignez-nous/devenez-sapeur-pompier-volontaire/",
    organizationUrl: "https://sapeurs-pompiers65.fr/",
  },
  {
    dept: "66",
    organizationName: "SDIS des Pyrénées Orientales",
    applicationUrl: "https://www.sdis66.fr/nous-rejoindre/devenir-sapeur-pompier-volontaire/",
    organizationUrl: "https://www.sdis66.fr/",
  },
  {
    dept: "67",
    organizationName: "SIS du Bas-Rhin",
    applicationUrl: "https://www.sis67.alsace/fr/engagement-et-emploi/sapeur-pompier-volontaire/devenir-sapeur-pompier-volontaire-formulaire-de-prise",
    organizationUrl: "https://www.sis67.alsace/fr",
  },
  {
    dept: "68",
    organizationName: "SIS du Haut-Rhin",
    applicationUrl: "https://www.sdis68.fr/Devenir-sapeur-pompier/Devenir-sapeur-pompier-volontaire-dans-Haut-Rhin/Formulaire-renseignements.html",
    organizationUrl: "https://www.sdis68.fr/",
  },
  { dept: "69", organizationName: "SDMIS", applicationUrl: "https://formulaire.sdmis.fr/runet/client/Reponse?i=689648086&s=DF61B133", organizationUrl: "https://sdmis.fr/" },
  {
    dept: "70",
    organizationName: "SDIS de la Haute Saône",
    applicationUrl: "https://www.sdis70.fr/devenez-sapeur-pompier-volontaire.htm",
    organizationUrl: "https://www.sdis70.fr/",
  },
  {
    dept: "71",
    organizationName: "SDIS de la Saône et Loire",
    applicationUrl: "https://www.sdis71.fr/devenir-sapeur-pompier-volontaire/",
    organizationUrl: "https://www.sdis71.fr/",
  },
  { dept: "72", organizationName: "SDIS de la Sarthe", applicationUrl: "https://www.sdis72.fr/sapeur-pompier-volontaires/", organizationUrl: "https://www.sdis72.fr/" },
  {
    dept: "73",
    organizationName: "SDIS de la Savoie",
    applicationUrl: "https://www.demarches-simplifiees.fr/commencer/pompiervolontaire73-etape1",
    organizationUrl: "https://www.sdis73.fr/internet/jcms/sdis73p1_8898/fr/accueil",
  },
  { dept: "74", organizationName: "SDIS de la Haute Savoie", applicationUrl: "https://www.sdis74.fr/candidature/", organizationUrl: "https://www.sdis74.fr/" },
  { dept: "76", organizationName: "SDIS Seine Maritime", applicationUrl: "https://www.sdis76.fr/sapeur-pompier-volontaire/", organizationUrl: "https://www.sdis76.fr/" },
  {
    dept: "77",
    organizationName: "SDIS Seine-et-Marne",
    applicationUrl: "https://www.sdis77.fr/nous-rejoindre/devenir-sapeur-pompier-en-seine-et-marne/candidature-sapeur-pompier-volontaire/",
    organizationUrl: "https://www.sdis77.fr/",
  },
  {
    dept: "78",
    organizationName: "SDIS des Yvelines",
    applicationUrl: "https://www.sdis78.fr/rejoignez-le-sdis78/sapeurs-pompiers-volontaires",
    organizationUrl: "https://www.sdis78.fr/",
  },
  {
    dept: "79",
    organizationName: "SDIS des Deux Sèvres",
    applicationUrl: "https://www.sdis79.fr/rejoindre-sdis-79/sapeurs-pompiers-volontaires/devenir-spv/",
    organizationUrl: "https://www.sdis79.fr/",
  },
  {
    dept: "80",
    organizationName: "SDIS de la Somme",
    applicationUrl:
      "https://docs.google.com/forms/d/1-V-ovmFrgTGSlSIcvEz-NaivM1py3SU9haZvW0usYHw/viewform?ts=6564b414&edit_requested=true#response=ACYDBNgmwKIyniXJQpWNJNdCA3XUeHNuHgf09_d39qlXYcHr3pje3RBLSMuyt0tlN0Wj9Oc",
    organizationUrl: "https://sdis80.fr/",
  },
  {
    dept: "81",
    organizationName: "SDIS du Tarn",
    applicationUrl: "https://www.sdis81.fr/devenez-sapeur-pompier-volontaire-et-rejoignez-le-corps-departemental-du-tarn/",
    organizationUrl: "https://www.sdis81.fr/",
  },
  { dept: "82", organizationName: "SDIS du Tarn-et-Garonne", applicationUrl: "https://www.sdis82.fr/sapeur-pompier-volontaire/", organizationUrl: "https://www.sdis82.fr/" },
  { dept: "83", organizationName: "SDIS du Var", applicationUrl: "https://www.sdis83.fr/devenir-sapeur-pompier-volontaire-spv", organizationUrl: "https://www.sdis83.fr/" },
  { dept: "84", organizationName: "SDIS du Vaucluse", applicationUrl: "https://www.sdis84.fr/internet/dij_5744/devenir-spv", organizationUrl: "https://www.sdis84.fr/" },
  {
    dept: "85",
    organizationName: "SDIS de la Vendée",
    applicationUrl: "https://sdis-vendee.com/nos-talents/rejoignez-laventure/rejoindre-les-sapeurs-pompiers-volontaires/",
    organizationUrl: "https://sdis-vendee.com/",
  },
  {
    dept: "86",
    organizationName: "SDIS de la Vienne",
    applicationUrl:
      "https://www.demarches-simplifiees.fr/commencer/candidature-sapeur-pompier-volontaire-sdis-86/1FAIpQLScIdKyMXWz1vB2SSJ1iVw2Ey1o7V3u7xvcEYgLpvVoFzkHBag/viewform",
    organizationUrl: "https://www.sdis86.net/",
  },
  { dept: "87", organizationName: "SDIS de la Haute Vienne", applicationUrl: "https://sdis-87.fr/sapeurs-pompiers-volontaires/", organizationUrl: "https://sdis-87.fr/portail/" },
  {
    dept: "88",
    organizationName: "SDIS des Vosges",
    applicationUrl: "https://www.sdis88.fr/index.php/accueil/nous-rejoindre/devenir-sapeur-pompier-volontaire",
    organizationUrl: "https://www.sdis88.fr/",
  },
  { dept: "89", organizationName: "SDIS de l'Yonne", applicationUrl: "https://www.sdis89.fr/devenir-sapeur-pompier-volontaire/", organizationUrl: "https://www.sdis89.fr/" },
  { dept: "91", organizationName: "SDIS de l'Essonne", applicationUrl: "https://sdis91.fr/sapeur-pompier-volontaire/", organizationUrl: "https://sdis91.fr/" },
  {
    dept: "95",
    organizationName: "SDIS du Val d'Oise",
    applicationUrl: "https://www.pompiers95.fr/volontaire-un-engagement-citoyen/sengager/",
    organizationUrl: "https://www.pompiers95.fr/",
  },
  {
    dept: "971",
    organizationName: "SDIS de la Guadeloupe",
    applicationUrl: "https://www.sdis971.fr/sapeur-pompier-volontaire/",
    organizationUrl: "https://www.sdis971.fr/sapeur-pompier-volontaire/",
  },
  {
    dept: "972",
    organizationName: "SDIS Martinique",
    applicationUrl: "https://sis972.fr/sapeur-pompier-volontaire/",
    organizationUrl: "https://sis972.fr/sapeur-pompier-volontaire/",
  },
  { dept: "973", organizationName: "Union départementale des SP de Guyane", applicationUrl: "https://udsp973.fr/", organizationUrl: "https://udsp973.fr/" },
  {
    dept: "974",
    organizationName: "SDIS de la Réunion",
    applicationUrl: "http://www.sdis974.re/navigation-principale/le-personnel/devenir-sapeur-pompier-volontaire.html",
    organizationUrl: "https://sdis974.re/login_up.php",
  },
  { dept: "976", organizationName: "SDIS Mayotte", applicationUrl: "https://www.sdis976.fr/sapeur-pompier-volontaire.html", organizationUrl: "https://www.sdis976.fr/" },
];

export const DESCRIPTION_SPV = `<h2>🔥 Et si vous deveniez sapeur-pompier volontaire près de chez vous ?</h2>
<p>En donnant quelques heures par semaine, vous rejoignez une équipe soudée au cœur de votre territoire et vous agissez concrètement pour protéger et aider la population.</p>
<p>Quel que soit votre profil – femme ou homme, étudiant·e, salarié·e, ou déjà engagé·e ailleurs – le volontariat s'adapte à vos disponibilités et à vos envies.</p>

<h3>Ce que vous ferez</h3>
<p>En tant que sapeur-pompier volontaire, vous accompagnerez les équipes de votre centre de secours pour des missions variées de secours et de protection :</p>
<ul>
<li>🚑 porter secours aux personnes</li>
<li>🚗 sécuriser des accidents de la route</li>
<li>🌪 protéger les habitants et les biens lors d'événements exceptionnels</li>
<li>🔥 participer à la lutte contre les incendies</li>
</ul>
<p>👉 Vous serez formé et épaulé à chaque étape : la formation est adaptée à chacun, progressive, et vous permettra d'acquérir des compétences utiles toute la vie.</p>

<h3>Pourquoi s'engager ?</h3>
<ul>
<li>👩‍🚒 agir concrètement pour les autres</li>
<li>🤝 rejoindre une équipe soudée et solidaire</li>
<li>🎓 développer des compétences reconnues (secourisme, sécurité, travail en équipe…)</li>
<li>🏡 s'engager près de chez soi</li>
<li>💼 compatible avec une activité professionnelle ou des études</li>
<li>💰 indemnité : 0 à 13 € / heure selon les missions et le grade</li>
</ul>

<h3>Combien de temps faut-il donner ?</h3>
<p>L'engagement s'adapte à votre rythme : que vous puissiez quelques heures par semaine ou davantage. Vous participerez à :</p>
<ul>
<li>des gardes ou astreintes, selon vos disponibilités</li>
<li>des interventions lorsque vous êtes appelé·e</li>
<li>des formations régulières en équipe</li>
</ul>
<p>Chaque centre de secours organise ses plannings pour permettre à chacun de concilier engagement et vie personnelle.</p>

<h3>Qui peut devenir sapeur-pompier volontaire ?</h3>
<p>Tout le monde peut s'engager, il suffit d'avoir la motivation d'aider et d'apprendre.</p>
<ul>
<li>✔ Dès 16 ans</li>
<li>✔ Être apte médicalement</li>
<li>✔ Habiter ou travailler à proximité d'un centre de secours</li>
<li>✔ Suivre une formation initiale accompagnée</li>
</ul>
<p>Pas besoin d'être un grand sportif ou d'avoir déjà de l'expérience : vous serez préparé et formé pas à pas.</p>

<h3>Comment candidater ?</h3>
<p>Cliquez sur <strong>Je m'engage</strong> pour accéder au formulaire officiel. Vous serez ensuite contacté·e pour :</p>
<ul>
<li>un entretien pour échanger sur votre motivation</li>
<li>des tests simples d'aptitude physique et médicale</li>
<li>la formation initiale, pour débuter en toute confiance</li>
</ul>`;
