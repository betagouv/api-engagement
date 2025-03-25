import { RiCheckboxCircleFill, RiCloseCircleFill, RiTimeFill } from "react-icons/ri";

export const STATUS = {
  PENDING: "À modérer",
  ONGOING: "En cours de traitement",
  ACCEPTED: "Acceptée",
  REFUSED: "Refusée",
};
export const STATUS_PLR = {
  PENDING: "À modérer",
  ONGOING: "En cours de traitement",
  ACCEPTED: "Acceptées",
  REFUSED: "Refusées",
};

export const STATUS_ICONS = {
  PENDING: <RiTimeFill className="text-[#fc5d00]" />,
  ONGOING: <RiTimeFill className="text-[#fc5d00]" />,
  ACCEPTED: <RiCheckboxCircleFill className="text-[#18753C]" />,
  REFUSED: <RiCloseCircleFill className="text-[#ce0500]" />,
};

export const STATUS_COLORS = {
  PENDING: "#fc5d00",
  ONGOING: "#fc5d00",
  ACCEPTED: "#18753C",
  REFUSED: "#ce0500",
};

export const STATUS_GRAPH_COLORS = {
  PENDING: "#ff7a55",
  ONGOING: "#ff7a55",
  ACCEPTED: "#3bea7e",
  REFUSED: "#f95c5e",
};

export const JVA_MODERATION_COMMENTS_LABELS = {
  OTHER: "Autre",
  MISSION_ALREADY_PUBLISHED: "La mission a déjà été publiée sur JeVeuxAider.gouv.fr",
  CONTENT_INSUFFICIENT: "Le contenu est insuffisant / non qualitatif",
  MISSION_DATE_NOT_COMPATIBLE: "La date de la mission n'est pas compatible avec le recrutement de bénévoles",
  MISSION_NOT_COMPLIANT: "La mission ne respecte pas la charte de la Réserve Civique",
  ORGANIZATION_ALREADY_PUBLISHED: "L'organisation est déjà inscrite sur JeVeuxAider.gouv.fr",
  ORGANIZATION_NOT_COMPLIANT: "L'organisation n'est pas conforme à la charte de la Réserve Civique",
  INFORMATION_INSUFFICIENT: "Les informations sont insuffisantes pour modérer l'organisation",
  MISSION_CREATION_DATE_TOO_OLD: "La mission est refusée car la date de création est trop ancienne (> 6 mois)",
};

// export const COMMENTS = [
//   "Autre",
//   "La mission a déjà été publiée sur JeVeuxAider.gouv.fr",
//   "Le contenu est insuffisant / non qualitatif",
//   "La date de la mission n'est pas compatible avec le recrutement de bénévoles",
//   "La mission ne respecte pas la charte de la Réserve Civique",
//   "L'organisation est déjà inscrite sur JeVeuxAider.gouv.fr",
//   "L'organisation n'est pas conforme à la charte de la Réserve Civique",
//   "Les informations sont insuffisantes pour modérer l'organisation",
//   "La mission est refusée car la date de création est trop ancienne (> 6 mois)",
// ];

export const moderationStatusBadges = {
  PENDING: <span className="rounded bg-[#fff2ea] px-2 py-1 text-sm font-semibold uppercase text-[#fc5d00]">À modérer</span>,
  ONGOING: <span className="rounded bg-[#fff2ea] px-2 py-1 text-sm font-semibold uppercase text-[#fc5d00]">En cours de traitement</span>,
  ACCEPTED: <span className="rounded bg-[#B8FEC9] px-2 py-1 text-sm font-semibold uppercase text-[#18753C]">Acceptée</span>,
  REFUSED: <span className="rounded bg-[#ce0500]/10 px-2 py-1 text-sm font-semibold uppercase text-[#ce0500]">Refusée</span>,
};

export const DEPARTMENT_LABELS = {
  10: "Aube (10)",
  11: "Aude (11)",
  12: "Aveyron (12)",
  13: "Bouches-du-Rhône (13)",
  14: "Calvados (14)",
  15: "Cantal (15)",
  16: "Charente (16)",
  17: "Charente-Maritime (17)",
  18: "Cher (18)",
  19: "Corrèze (19)",
  21: "Côte-d'Or (21)",
  22: "Côtesd'Armor (22)",
  23: "Creuse (23)",
  24: "Dordogne (24)",
  25: "Doubs (25)",
  26: "Drôme (26)",
  27: "Eure (27)",
  28: "Eure-et-Loir (28)",
  29: "Finistère (29)",
  30: "Gard (30)",
  31: "Haute-Garonne (31)",
  32: "Gers (32)",
  33: "Gironde (33)",
  34: "Hérault (34)",
  35: "Ille-et-Vilaine (35)",
  36: "Indre (36)",
  37: "Indre-et-Loire (37)",
  38: "Isère (38)",
  39: "Jura (39)",
  40: "Landes (40)",
  41: "Loir-et-Cher (41)",
  42: "Loire (42)",
  43: "Haute-Loire (43)",
  44: "Loire-Atlantique (44)",
  45: "Loiret (45)",
  46: "Lot (46)",
  47: "Lot-et-Garonne (47)",
  48: "Lozère (48)",
  49: "Maine-et-Loire (49)",
  50: "Manche (50)",
  51: "Marne (51)",
  52: "Haute-Marne (52)",
  53: "Mayenne (53)",
  54: "Meurthe-et-Moselle (54)",
  55: "Meuse (55)",
  56: "Morbihan (56)",
  57: "Moselle (57)",
  58: "Nièvre (58)",
  59: "Nord (59)",
  60: "Oise (60)",
  61: "Orne (61)",
  62: "Pas-de-Calais (62)",
  63: "Puy-de-Dôme (63)",
  64: "Pyrénées-Atlantiques (64)",
  65: "Hautes-Pyrénées (65)",
  66: "Pyrénées-Orientales (66)",
  67: "Bas-Rhin (67)",
  68: "Haut-Rhin (68)",
  69: "Rhône (69)",
  70: "Haute-Saône (70)",
  71: "Saône-et-Loire (71)",
  72: "Sarthe (72)",
  73: "Savoie (73)",
  74: "Haute-Savoie (74)",
  75: "Paris (75)",
  76: "Seine-Maritime (76)",
  77: "Seine-et-Marne (77)",
  78: "Yvelines (78)",
  79: "Deux-Sèvres (79)",
  80: "Somme (80)",
  81: "Tarn (81)",
  82: "Tarn-et-Garonne (82)",
  83: "Var (83)",
  84: "Vaucluse (84)",
  85: "Vendée (85)",
  86: "Vienne (86)",
  87: "Haute-Vienne (87)",
  88: "Vosges (88)",
  89: "Yonne (89)",
  90: "TerritoiredeBelfort (90)",
  91: "Essonne (91)",
  92: "Hauts-de-Seine (92)",
  93: "Seine-St-Denis (93)",
  94: "Val-de-Marne (94)",
  95: "Val-D'Oise (95)",
  971: "Guadeloupe (971)",
  972: "Martinique (972)",
  973: "Guyane (973)",
  974: "LaRéunion (974)",
  976: "Mayotte (976)",
  988: "Nouvelle-Calédonie (988)",
  "01": "Ain (01)",
  "02": "Aisne (02)",
  "03": "Allier (03)",
  "04": "Alpes-de-Haute-Provence (04)",
  "05": "Hautes-Alpes (05)",
  "06": "Alpes-Maritimes (06)",
  "07": "Ardèche (07)",
  "08": "Ardennes (08)",
  "09": "Ariège (09)",
  "2A": "Corse-du-Sud (2A)",
  "2B": "Haute-Corse (2B)",
};

export const DOMAINS = {
  environnement: <span className="rounded bg-[#FEE7FC] px-2 py-1 text-sm font-semibold uppercase text-[#6E445A]">Environnement</span>,
  "solidarite-insertion": <span className="rounded bg-[#FEE7FC] px-2 py-1 text-sm font-semibold uppercase text-[#6E445A]">Solidarité et insertion</span>,
  "prevention-protection": <span className="rounded bg-[#FEE7FC] px-2 py-1 text-sm font-semibold uppercase text-[#6E445A]">Prévention et protection</span>,
  sante: <span className="rounded bg-[#FEE7FC] px-2 py-1 text-sm font-semibold uppercase text-[#6E445A]">Santé</span>,
  "culture-loisirs": <span className="rounded bg-[#FEE7FC] px-2 py-1 text-sm font-semibold uppercase text-[#6E445A]">Culture et loisirs</span>,
  education: <span className="rounded bg-[#FEE7FC] px-2 py-1 text-sm font-semibold uppercase text-[#6E445A]">Éducation pour tous</span>,
  emploi: <span className="rounded bg-[#FEE7FC] px-2 py-1 text-sm font-semibold uppercase text-[#6E445A]">Emploi</span>,
  sport: <span className="rounded bg-[#FEE7FC] px-2 py-1 text-sm font-semibold uppercase text-[#6E445A]">Sport</span>,
  humanitaire: <span className="rounded bg-[#FEE7FC] px-2 py-1 text-sm font-semibold uppercase text-[#6E445A]">Humanitaire</span>,
  animaux: <span className="rounded bg-[#FEE7FC] px-2 py-1 text-sm font-semibold uppercase text-[#6E445A]">Animaux</span>,
  "vivre-ensemble": <span className="rounded bg-[#FEE7FC] px-2 py-1 text-sm font-semibold uppercase text-[#6E445A]">Vivre ensemble</span>,
  autre: <span className="rounded bg-[#FEE7FC] px-2 py-1 text-sm font-semibold uppercase text-[#6E445A]">Autre</span>,
};

export default STATUS;
