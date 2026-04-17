export interface SdisEntry {
  dept: string;
  organizationName: string;
  applicationUrl: string;
  organizationUrl: string;
}

export interface DeptAddress {
  city: string;
  postalCode: string;
  departmentCode: string;
  departmentName: string;
  region: string;
  country: string;
}

// BSPP (75, 92, 93, 94) exclus — brigade militaire, hors périmètre SDIS
// SDIS sans URL de candidature exclus — applicationUrl requis par l'API
export const SDIS_DATA: SdisEntry[] = [
  {
    dept: "03",
    organizationName: "SDIS de l'Allier",
    applicationUrl: "https://www.sdis03.com/devenir-sapeur-pompier-volontaire/#contact",
    organizationUrl: "https://www.sdis03.com/",
  },
  {
    dept: "05",
    organizationName: "SDIS des Hautes Alpes",
    applicationUrl: "https://www.sdis05.fr/57-les-sapeurs-pompiers-volontaires.htm",
    organizationUrl: "https://www.sdis05.fr/",
  },
  {
    dept: "07",
    organizationName: "SDIS de l'Ardèche",
    applicationUrl: "https://forms.office.com/pages/responsepage.aspx?id=D6Dvpnxt4UesfqgKiNpC7EF74zw0m9JBml5hLeHPkDNUMFcwUDJKTTNVSFJVMDZFWDNUTURaRFkxUS4u&route=shorturl",
    organizationUrl: "https://www.sdis07.fr/",
  },
  { dept: "09", organizationName: "SDIS de l'Ariège", applicationUrl: "https://sdis09.com/recrutement/", organizationUrl: "https://sdis09.com/" },
  {
    dept: "10",
    organizationName: "SDIS de l'Aube",
    applicationUrl: "https://www.sdis10.com/accueil/rejoignez-nous/fomulaire-spv/",
    organizationUrl: "https://www.sdis10.com/accueil/rejoignez-nous/",
  },
  { dept: "11", organizationName: "SDIS de l'Aude", applicationUrl: "https://sdis11.fr/volontariat/", organizationUrl: "https://sdis11.fr/devenir-sp-volontaire/" },
  { dept: "13", organizationName: "SDIS des Bouches du Rhône", applicationUrl: "https://pompiers13.org/devenir-spv/", organizationUrl: "https://pompiers13.org/engagement/spv/" },
  {
    dept: "14",
    organizationName: "SDIS du Calvados",
    applicationUrl: "https://www.sdis14.fr/accueil/nous-rejoindre/devenir-sapeur-pompier-volontair.html",
    organizationUrl: "https://www.sdis14.fr/accueil.html",
  },
  {
    dept: "17",
    organizationName: "SDIS de Charente Maritime",
    applicationUrl: "https://www.demarches-simplifiees.fr/commencer/fml-prh-052",
    organizationUrl: "https://sdis17.fr/",
  },
  { dept: "18", organizationName: "SDIS du Cher", applicationUrl: "https://demarche.numerique.gouv.fr/commencer/devenir_pompiers18", organizationUrl: "https://pompiers18.fr/" },
  {
    dept: "19",
    organizationName: "SDIS de la Corrèze",
    applicationUrl: "https://demarche.numerique.gouv.fr/commencer/candidature-sapeur-pompier-volontaire-sdis-19",
    organizationUrl: "https://www.sdis-19.com/devenir-sapeur-pompier-volontaire/",
  },
  {
    dept: "2A",
    organizationName: "SIS de Corse du Sud",
    applicationUrl: "https://sis2b.corsica/nous-rejoindre/devenir-sapeur-pompier-volontaire/candidature-spv/",
    organizationUrl: "https://www.sis2a.corsica/",
  },
  {
    dept: "2B",
    organizationName: "SIS de Haute Corse",
    applicationUrl: "https://sis2b.corsica/nous-rejoindre/devenir-sapeur-pompier-volontaire/candidature-spv/",
    organizationUrl: "https://sis2b.corsica/",
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
  { dept: "26", organizationName: "SDIS de la Drôme", applicationUrl: "https://www.pompiers26.com/sdis26", organizationUrl: "https://www.pompiers26.com/sdis26" },
  { dept: "27", organizationName: "SDIS de l'Eure", applicationUrl: "https://www.sapeurspompiers27.fr/devenirpompier27/", organizationUrl: "https://www.sapeurspompiers27.fr/" },
  { dept: "31", organizationName: "SDIS de la Haute Garonne", applicationUrl: "https://www.sdis31.fr/contactez-nous/", organizationUrl: "https://www.sdis31.fr/rejoignez-nous/" },
  {
    dept: "33",
    organizationName: "SDIS de Gironde",
    applicationUrl: "https://www.pompiers33.fr/recrutement-de-sapeurs-pompiers-volontaires/",
    organizationUrl: "https://www.pompiers33.fr/",
  },
  { dept: "34", organizationName: "SDIS de l'Hérault", applicationUrl: "https://www.sdis34.fr/formulaire-devenir-spv/", organizationUrl: "https://www.sdis34.fr/" },
  { dept: "38", organizationName: "SDIS de l'Isère", applicationUrl: "https://www.sdis38.fr/30-sapeur-pompier-volontaire.htm", organizationUrl: "https://www.sdis38.fr/" },
  {
    dept: "39",
    organizationName: "SDIS du Jura",
    applicationUrl: "https://www.jurapompiers.fr/devenez-sapeur-pompier-volontaire",
    organizationUrl: "https://www.jurapompiers.fr/",
  },
  { dept: "41", organizationName: "SDIS Loir-et-Cher", applicationUrl: "https://www.sdis41.fr/contact/", organizationUrl: "https://www.sdis41.fr/" },
  { dept: "42", organizationName: "SDIS de la Loire", applicationUrl: "https://www.sdis42.fr/index.php/nous-contacter", organizationUrl: "https://www.sdis42.fr/" },
  {
    dept: "44",
    organizationName: "SDIS de Loire Atlantique",
    applicationUrl: "https://www.sdis44.fr/nous-rejoindre/devenir-sapeur-pompier-volontaire/postuler/",
    organizationUrl: "https://www.sdis44.fr/",
  },
  { dept: "45", organizationName: "SDIS du Loiret", applicationUrl: "https://sdis45.com/sp-volontaires/", organizationUrl: "https://sdis45.com/" },
  {
    dept: "47",
    organizationName: "SDIS du Lot-et-Garonne",
    applicationUrl: "https://www.sdis47.fr/devenez-sapeur-pompier-volontaire/deposer-une-demande-de-sapeur-pompier-volontaire/",
    organizationUrl: "https://www.sdis47.fr/",
  },
  { dept: "49", organizationName: "SDIS Maine et Loire", applicationUrl: "https://www.sdis49.fr/nous-contacter/", organizationUrl: "https://www.sdis49.fr/" },
  { dept: "50", organizationName: "SDIS de la Manche", applicationUrl: "https://www.sdis50.fr/contact/", organizationUrl: "https://www.sdis50.fr/" },
  { dept: "55", organizationName: "SDIS de la Meuse", applicationUrl: "https://form.jotform.com/240253830596054", organizationUrl: "https://www.pompiers55.fr/" },
  { dept: "56", organizationName: "SDIS du Morbihan", applicationUrl: "https://www.sdis56.fr/contact/", organizationUrl: "https://www.sdis56.fr/" },
  {
    dept: "57",
    organizationName: "SDIS de la Moselle",
    applicationUrl: "https://www.demarches-simplifiees.fr/commencer/formulaire-de-recrutement-sdis57",
    organizationUrl: "https://www.sdis57.fr/home/",
  },
  { dept: "58", organizationName: "SDIS de la Nièvre", applicationUrl: "https://sdis58.fr/formulaire-de-contact-spv/", organizationUrl: "https://sdis58.fr/" },
  { dept: "59", organizationName: "SDIS du Nord", applicationUrl: "https://extranet.sdis59.fr/FormulaireSPV/", organizationUrl: "https://www.sdis59.fr/" },
  { dept: "60", organizationName: "SDIS de l'Oise", applicationUrl: "https://www.sdis60.fr/recrutement-spv/", organizationUrl: "https://www.sdis60.fr/" },
  {
    dept: "63",
    organizationName: "SDIS du Puy de Dome",
    applicationUrl: "https://www.sdis63.fr/sapeur-pompier/sapeur-pompier-volontaire/",
    organizationUrl: "https://www.sdis63.fr/",
  },
  { dept: "64", organizationName: "SDIS des Pyrénées Atlantique", applicationUrl: "https://www.sdis64.fr/contact/", organizationUrl: "https://www.sdis64.fr/" },
  { dept: "65", organizationName: "SDIS des Hautes Pyrénées", applicationUrl: "https://sapeurs-pompiers65.fr/contactez-nous/", organizationUrl: "https://sapeurs-pompiers65.fr/" },
  {
    dept: "66",
    organizationName: "SDIS des Pyrénées Orientales",
    applicationUrl: "https://www.sdis66.fr/formulaire-dengagement-sapeur-pompier-volontaire/",
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
  { dept: "72", organizationName: "SDIS de la Sarthe", applicationUrl: "https://www.sdis72.fr/sapeur-pompier-volontaires/", organizationUrl: "https://www.sdis72.fr/" },
  {
    dept: "73",
    organizationName: "SDIS de la Savoie",
    applicationUrl: "https://www.demarches-simplifiees.fr/commencer/pompiervolontaire73-etape1",
    organizationUrl: "https://www.sdis73.fr/",
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
    dept: "79",
    organizationName: "SDIS des Deux Sèvres",
    applicationUrl: "https://www.sdis79.fr/rejoindre-sdis-79/sapeurs-pompiers-volontaires/devenir-spv/",
    organizationUrl: "https://www.sdis79.fr/",
  },
  {
    dept: "80",
    organizationName: "SDIS de la Somme",
    applicationUrl:
      "https://docs.google.com/forms/u/0/d/1-V-ovmFrgTGSlSIcvEz-NaivM1py3SU9haZvW0usYHw/viewform?ts=6564b414&edit_requested=true#response=ACYDBNgmwKIyniXJQpWNJNdCA3XUeHNuHgf09_d39qlXYcHr3pje3RBLSMuyt0tlN0Wj9Oc",
    organizationUrl: "https://sdis80.fr/",
  },
  { dept: "82", organizationName: "SDIS du Tarn-et-Garonne", applicationUrl: "https://82.spv.recrutesp.app/engagement-type", organizationUrl: "https://www.sdis82.fr/" },
  { dept: "83", organizationName: "SDIS du Var", applicationUrl: "https://www.sdis83.fr/nous-contacter", organizationUrl: "https://www.sdis83.fr/" },
  {
    dept: "85",
    organizationName: "SDIS de la Vendée",
    applicationUrl: "https://sdis-vendee.com/nos-talents/rejoignez-laventure/rejoindre-les-sapeurs-pompiers-volontaires/",
    organizationUrl: "https://sdis-vendee.com/",
  },
  {
    dept: "86",
    organizationName: "SDIS de la Vienne",
    applicationUrl: "https://demarche.numerique.gouv.fr/commencer/candidature-sapeur-pompier-volontaire-sdis-86",
    organizationUrl: "https://www.sdis86.net/",
  },
  { dept: "89", organizationName: "SDIS de l'Yonne", applicationUrl: "https://www.sdis89.fr/contact/", organizationUrl: "https://www.sdis89.fr/" },
  { dept: "91", organizationName: "SDIS de l'Essonne", applicationUrl: "https://sdis91.fr/sapeur-pompier-volontaire/", organizationUrl: "https://sdis91.fr/" },
  {
    dept: "95",
    organizationName: "SDIS du Val d'Oise",
    applicationUrl: "https://www.pompiers95.fr/volontaire-un-engagement-citoyen/sengager/",
    organizationUrl: "https://www.pompiers95.fr/",
  },
  { dept: "971", organizationName: "SDIS de la Guadeloupe", applicationUrl: "https://www.sdis971.fr/contacts/", organizationUrl: "https://www.sdis971.fr/" },
  { dept: "972", organizationName: "SDIS Martinique", applicationUrl: "https://sis972.fr/sapeur-pompier-volontaire/", organizationUrl: "https://sis972.fr/" },
  { dept: "976", organizationName: "SDIS Mayotte", applicationUrl: "https://www.sdis976.fr/espace-contact.html", organizationUrl: "https://www.sdis976.fr/" },
];

export const DEPT_ADDRESS_MAP: Record<string, DeptAddress> = {
  "01": { city: "Bourg-en-Bresse", postalCode: "01000", departmentCode: "01", departmentName: "Ain", region: "Auvergne-Rhône-Alpes", country: "France" },
  "02": { city: "Laon", postalCode: "02000", departmentCode: "02", departmentName: "Aisne", region: "Hauts-de-France", country: "France" },
  "03": { city: "Moulins", postalCode: "03000", departmentCode: "03", departmentName: "Allier", region: "Auvergne-Rhône-Alpes", country: "France" },
  "04": { city: "Digne-les-Bains", postalCode: "04000", departmentCode: "04", departmentName: "Alpes-de-Haute-Provence", region: "Provence-Alpes-Côte d'Azur", country: "France" },
  "05": { city: "Gap", postalCode: "05000", departmentCode: "05", departmentName: "Hautes-Alpes", region: "Provence-Alpes-Côte d'Azur", country: "France" },
  "06": { city: "Nice", postalCode: "06000", departmentCode: "06", departmentName: "Alpes-Maritimes", region: "Provence-Alpes-Côte d'Azur", country: "France" },
  "07": { city: "Privas", postalCode: "07000", departmentCode: "07", departmentName: "Ardèche", region: "Auvergne-Rhône-Alpes", country: "France" },
  "08": { city: "Charleville-Mézières", postalCode: "08000", departmentCode: "08", departmentName: "Ardennes", region: "Grand Est", country: "France" },
  "09": { city: "Foix", postalCode: "09000", departmentCode: "09", departmentName: "Ariège", region: "Occitanie", country: "France" },
  "10": { city: "Troyes", postalCode: "10000", departmentCode: "10", departmentName: "Aube", region: "Grand Est", country: "France" },
  "11": { city: "Carcassonne", postalCode: "11000", departmentCode: "11", departmentName: "Aude", region: "Occitanie", country: "France" },
  "12": { city: "Rodez", postalCode: "12000", departmentCode: "12", departmentName: "Aveyron", region: "Occitanie", country: "France" },
  "13": { city: "Marseille", postalCode: "13000", departmentCode: "13", departmentName: "Bouches-du-Rhône", region: "Provence-Alpes-Côte d'Azur", country: "France" },
  "14": { city: "Caen", postalCode: "14000", departmentCode: "14", departmentName: "Calvados", region: "Normandie", country: "France" },
  "15": { city: "Aurillac", postalCode: "15000", departmentCode: "15", departmentName: "Cantal", region: "Auvergne-Rhône-Alpes", country: "France" },
  "16": { city: "Angoulême", postalCode: "16000", departmentCode: "16", departmentName: "Charente", region: "Nouvelle-Aquitaine", country: "France" },
  "17": { city: "La Rochelle", postalCode: "17000", departmentCode: "17", departmentName: "Charente-Maritime", region: "Nouvelle-Aquitaine", country: "France" },
  "18": { city: "Bourges", postalCode: "18000", departmentCode: "18", departmentName: "Cher", region: "Centre-Val de Loire", country: "France" },
  "19": { city: "Tulle", postalCode: "19000", departmentCode: "19", departmentName: "Corrèze", region: "Nouvelle-Aquitaine", country: "France" },
  "2A": { city: "Ajaccio", postalCode: "20000", departmentCode: "2A", departmentName: "Corse-du-Sud", region: "Corse", country: "France" },
  "2B": { city: "Bastia", postalCode: "20200", departmentCode: "2B", departmentName: "Haute-Corse", region: "Corse", country: "France" },
  "21": { city: "Dijon", postalCode: "21000", departmentCode: "21", departmentName: "Côte-d'Or", region: "Bourgogne-Franche-Comté", country: "France" },
  "22": { city: "Saint-Brieuc", postalCode: "22000", departmentCode: "22", departmentName: "Côtes-d'Armor", region: "Bretagne", country: "France" },
  "23": { city: "Guéret", postalCode: "23000", departmentCode: "23", departmentName: "Creuse", region: "Nouvelle-Aquitaine", country: "France" },
  "24": { city: "Périgueux", postalCode: "24000", departmentCode: "24", departmentName: "Dordogne", region: "Nouvelle-Aquitaine", country: "France" },
  "25": { city: "Besançon", postalCode: "25000", departmentCode: "25", departmentName: "Doubs", region: "Bourgogne-Franche-Comté", country: "France" },
  "26": { city: "Valence", postalCode: "26000", departmentCode: "26", departmentName: "Drôme", region: "Auvergne-Rhône-Alpes", country: "France" },
  "27": { city: "Évreux", postalCode: "27000", departmentCode: "27", departmentName: "Eure", region: "Normandie", country: "France" },
  "28": { city: "Chartres", postalCode: "28000", departmentCode: "28", departmentName: "Eure-et-Loir", region: "Centre-Val de Loire", country: "France" },
  "29": { city: "Quimper", postalCode: "29000", departmentCode: "29", departmentName: "Finistère", region: "Bretagne", country: "France" },
  "30": { city: "Nîmes", postalCode: "30000", departmentCode: "30", departmentName: "Gard", region: "Occitanie", country: "France" },
  "31": { city: "Toulouse", postalCode: "31000", departmentCode: "31", departmentName: "Haute-Garonne", region: "Occitanie", country: "France" },
  "32": { city: "Auch", postalCode: "32000", departmentCode: "32", departmentName: "Gers", region: "Occitanie", country: "France" },
  "33": { city: "Bordeaux", postalCode: "33000", departmentCode: "33", departmentName: "Gironde", region: "Nouvelle-Aquitaine", country: "France" },
  "34": { city: "Montpellier", postalCode: "34000", departmentCode: "34", departmentName: "Hérault", region: "Occitanie", country: "France" },
  "35": { city: "Rennes", postalCode: "35000", departmentCode: "35", departmentName: "Ille-et-Vilaine", region: "Bretagne", country: "France" },
  "36": { city: "Châteauroux", postalCode: "36000", departmentCode: "36", departmentName: "Indre", region: "Centre-Val de Loire", country: "France" },
  "37": { city: "Tours", postalCode: "37000", departmentCode: "37", departmentName: "Indre-et-Loire", region: "Centre-Val de Loire", country: "France" },
  "38": { city: "Grenoble", postalCode: "38000", departmentCode: "38", departmentName: "Isère", region: "Auvergne-Rhône-Alpes", country: "France" },
  "39": { city: "Lons-le-Saunier", postalCode: "39000", departmentCode: "39", departmentName: "Jura", region: "Bourgogne-Franche-Comté", country: "France" },
  "40": { city: "Mont-de-Marsan", postalCode: "40000", departmentCode: "40", departmentName: "Landes", region: "Nouvelle-Aquitaine", country: "France" },
  "41": { city: "Blois", postalCode: "41000", departmentCode: "41", departmentName: "Loir-et-Cher", region: "Centre-Val de Loire", country: "France" },
  "42": { city: "Saint-Étienne", postalCode: "42000", departmentCode: "42", departmentName: "Loire", region: "Auvergne-Rhône-Alpes", country: "France" },
  "43": { city: "Le Puy-en-Velay", postalCode: "43000", departmentCode: "43", departmentName: "Haute-Loire", region: "Auvergne-Rhône-Alpes", country: "France" },
  "44": { city: "Nantes", postalCode: "44000", departmentCode: "44", departmentName: "Loire-Atlantique", region: "Pays de la Loire", country: "France" },
  "45": { city: "Orléans", postalCode: "45000", departmentCode: "45", departmentName: "Loiret", region: "Centre-Val de Loire", country: "France" },
  "46": { city: "Cahors", postalCode: "46000", departmentCode: "46", departmentName: "Lot", region: "Occitanie", country: "France" },
  "47": { city: "Agen", postalCode: "47000", departmentCode: "47", departmentName: "Lot-et-Garonne", region: "Nouvelle-Aquitaine", country: "France" },
  "48": { city: "Mende", postalCode: "48000", departmentCode: "48", departmentName: "Lozère", region: "Occitanie", country: "France" },
  "49": { city: "Angers", postalCode: "49000", departmentCode: "49", departmentName: "Maine-et-Loire", region: "Pays de la Loire", country: "France" },
  "50": { city: "Saint-Lô", postalCode: "50000", departmentCode: "50", departmentName: "Manche", region: "Normandie", country: "France" },
  "51": { city: "Châlons-en-Champagne", postalCode: "51000", departmentCode: "51", departmentName: "Marne", region: "Grand Est", country: "France" },
  "52": { city: "Chaumont", postalCode: "52000", departmentCode: "52", departmentName: "Haute-Marne", region: "Grand Est", country: "France" },
  "53": { city: "Laval", postalCode: "53000", departmentCode: "53", departmentName: "Mayenne", region: "Pays de la Loire", country: "France" },
  "54": { city: "Nancy", postalCode: "54000", departmentCode: "54", departmentName: "Meurthe-et-Moselle", region: "Grand Est", country: "France" },
  "55": { city: "Bar-le-Duc", postalCode: "55000", departmentCode: "55", departmentName: "Meuse", region: "Grand Est", country: "France" },
  "56": { city: "Vannes", postalCode: "56000", departmentCode: "56", departmentName: "Morbihan", region: "Bretagne", country: "France" },
  "57": { city: "Metz", postalCode: "57000", departmentCode: "57", departmentName: "Moselle", region: "Grand Est", country: "France" },
  "58": { city: "Nevers", postalCode: "58000", departmentCode: "58", departmentName: "Nièvre", region: "Bourgogne-Franche-Comté", country: "France" },
  "59": { city: "Lille", postalCode: "59000", departmentCode: "59", departmentName: "Nord", region: "Hauts-de-France", country: "France" },
  "60": { city: "Beauvais", postalCode: "60000", departmentCode: "60", departmentName: "Oise", region: "Hauts-de-France", country: "France" },
  "61": { city: "Alençon", postalCode: "61000", departmentCode: "61", departmentName: "Orne", region: "Normandie", country: "France" },
  "62": { city: "Arras", postalCode: "62000", departmentCode: "62", departmentName: "Pas-de-Calais", region: "Hauts-de-France", country: "France" },
  "63": { city: "Clermont-Ferrand", postalCode: "63000", departmentCode: "63", departmentName: "Puy-de-Dôme", region: "Auvergne-Rhône-Alpes", country: "France" },
  "64": { city: "Pau", postalCode: "64000", departmentCode: "64", departmentName: "Pyrénées-Atlantiques", region: "Nouvelle-Aquitaine", country: "France" },
  "65": { city: "Tarbes", postalCode: "65000", departmentCode: "65", departmentName: "Hautes-Pyrénées", region: "Occitanie", country: "France" },
  "66": { city: "Perpignan", postalCode: "66000", departmentCode: "66", departmentName: "Pyrénées-Orientales", region: "Occitanie", country: "France" },
  "67": { city: "Strasbourg", postalCode: "67000", departmentCode: "67", departmentName: "Bas-Rhin", region: "Grand Est", country: "France" },
  "68": { city: "Colmar", postalCode: "68000", departmentCode: "68", departmentName: "Haut-Rhin", region: "Grand Est", country: "France" },
  "69": { city: "Lyon", postalCode: "69000", departmentCode: "69", departmentName: "Rhône", region: "Auvergne-Rhône-Alpes", country: "France" },
  "70": { city: "Vesoul", postalCode: "70000", departmentCode: "70", departmentName: "Haute-Saône", region: "Bourgogne-Franche-Comté", country: "France" },
  "71": { city: "Mâcon", postalCode: "71000", departmentCode: "71", departmentName: "Saône-et-Loire", region: "Bourgogne-Franche-Comté", country: "France" },
  "72": { city: "Le Mans", postalCode: "72000", departmentCode: "72", departmentName: "Sarthe", region: "Pays de la Loire", country: "France" },
  "73": { city: "Chambéry", postalCode: "73000", departmentCode: "73", departmentName: "Savoie", region: "Auvergne-Rhône-Alpes", country: "France" },
  "74": { city: "Annecy", postalCode: "74000", departmentCode: "74", departmentName: "Haute-Savoie", region: "Auvergne-Rhône-Alpes", country: "France" },
  "76": { city: "Rouen", postalCode: "76000", departmentCode: "76", departmentName: "Seine-Maritime", region: "Normandie", country: "France" },
  "77": { city: "Melun", postalCode: "77000", departmentCode: "77", departmentName: "Seine-et-Marne", region: "Île-de-France", country: "France" },
  "78": { city: "Versailles", postalCode: "78000", departmentCode: "78", departmentName: "Yvelines", region: "Île-de-France", country: "France" },
  "79": { city: "Niort", postalCode: "79000", departmentCode: "79", departmentName: "Deux-Sèvres", region: "Nouvelle-Aquitaine", country: "France" },
  "80": { city: "Amiens", postalCode: "80000", departmentCode: "80", departmentName: "Somme", region: "Hauts-de-France", country: "France" },
  "81": { city: "Albi", postalCode: "81000", departmentCode: "81", departmentName: "Tarn", region: "Occitanie", country: "France" },
  "82": { city: "Montauban", postalCode: "82000", departmentCode: "82", departmentName: "Tarn-et-Garonne", region: "Occitanie", country: "France" },
  "83": { city: "Toulon", postalCode: "83000", departmentCode: "83", departmentName: "Var", region: "Provence-Alpes-Côte d'Azur", country: "France" },
  "84": { city: "Avignon", postalCode: "84000", departmentCode: "84", departmentName: "Vaucluse", region: "Provence-Alpes-Côte d'Azur", country: "France" },
  "85": { city: "La Roche-sur-Yon", postalCode: "85000", departmentCode: "85", departmentName: "Vendée", region: "Pays de la Loire", country: "France" },
  "86": { city: "Poitiers", postalCode: "86000", departmentCode: "86", departmentName: "Vienne", region: "Nouvelle-Aquitaine", country: "France" },
  "87": { city: "Limoges", postalCode: "87000", departmentCode: "87", departmentName: "Haute-Vienne", region: "Nouvelle-Aquitaine", country: "France" },
  "88": { city: "Épinal", postalCode: "88000", departmentCode: "88", departmentName: "Vosges", region: "Grand Est", country: "France" },
  "89": { city: "Auxerre", postalCode: "89000", departmentCode: "89", departmentName: "Yonne", region: "Bourgogne-Franche-Comté", country: "France" },
  "90": { city: "Belfort", postalCode: "90000", departmentCode: "90", departmentName: "Territoire de Belfort", region: "Bourgogne-Franche-Comté", country: "France" },
  "91": { city: "Évry-Courcouronnes", postalCode: "91000", departmentCode: "91", departmentName: "Essonne", region: "Île-de-France", country: "France" },
  "95": { city: "Cergy", postalCode: "95000", departmentCode: "95", departmentName: "Val-d'Oise", region: "Île-de-France", country: "France" },
  "971": { city: "Basse-Terre", postalCode: "97100", departmentCode: "971", departmentName: "Guadeloupe", region: "Guadeloupe", country: "France" },
  "972": { city: "Fort-de-France", postalCode: "97200", departmentCode: "972", departmentName: "Martinique", region: "Martinique", country: "France" },
  "973": { city: "Cayenne", postalCode: "97300", departmentCode: "973", departmentName: "Guyane", region: "Guyane", country: "France" },
  "974": { city: "Saint-Denis", postalCode: "97400", departmentCode: "974", departmentName: "La Réunion", region: "La Réunion", country: "France" },
  "976": { city: "Mamoudzou", postalCode: "97600", departmentCode: "976", departmentName: "Mayotte", region: "Mayotte", country: "France" },
};

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
