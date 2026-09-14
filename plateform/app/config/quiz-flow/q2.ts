import { numericRange } from "~/utils/conditions";
import type { StepDef } from "./types";

// Parcours v2 (identifiant "q2") — conservé tel quel pour pouvoir rollback (cf. QUIZ_FLOW_VERSION dans index.ts).
// Steps nommés comme leur taxonomy. Séquence, wording (titres/sous-titres), réponses proposées
// (`options`) et conditions de visibilité des steps.
// L'ordre ici dicte l'ordre de navigation (goNext/goBack).
export const QUIZ_FLOW_Q2: StepDef[] = [
  // Étape 1 — âge.
  { id: "age", route: "/quiz/age", title: "Quel âge as-tu ?", subtitle: "Certaines missions dépendent de l'âge." },
  // Étape 2 — handicap, posée uniquement entre 26 et 30 ans.
  {
    id: "handicap",
    route: "/quiz/handicap",
    title: "Es-tu en situation de handicap reconnue ?",
    subtitle: "Certaines missions sont accessibles jusqu’à 30 ans pour les personnes en situation de handicap.",
    options: ["handicap.oui", "handicap.non", "handicap.ne_se_prononce_pas"],
    condition: numericRange("age", 26, 30),
  },
  // Étape 3 — localisation.
  {
    id: "localisation",
    route: "/quiz/localisation",
    title: "Où veux-tu chercher des missions ?",
    subtitle: "Entre ton adresse pour découvrir les missions près de chez toi. Certaines missions peuvent aussi se faire à distance.",
  },
  // Étape 4 — mobilité, calibre le rayon de recherche autour de la localisation.
  {
    id: "mobilite",
    route: "/quiz/mobilite",
    title: "Comment tu te déplaces généralement ?",
    options: ["mobilite.pied_transports", "mobilite.velo", "mobilite.voiture"],
  },
  // Étape 5 — motivation de recherche.
  {
    id: "motivation_recherche",
    route: "/quiz/motivation-recherche",
    title: "Qu’est-ce qui t’amène aujourd’hui ?",
    options: [
      "motivation_recherche.premiere_experience",
      "motivation_recherche.decouverte_metier",
      "motivation_recherche.agir_pour_une_cause",
      "motivation_recherche.securite_pays",
      "motivation_recherche.remote",
      "motivation_recherche.rencontres",
      "motivation_recherche.indemnisation",
      "motivation_recherche.horaires_flexibles",
      "motivation_recherche.autre",
    ],
  },
  // Étape 6 — rythme.
  {
    id: "rythme",
    route: "/quiz/rythme",
    title: "Quel rythme te conviendrait le mieux ?",
    options: [
      "rythme.ponctuelle_journee",
      "rythme.quelques_heures_semaine",
      "rythme.plusieurs_jours_semaine",
      "rythme.quelques_jours_annee",
      "rythme.temps_plein_plusieurs_mois",
      "rythme.je_ne_sais_pas",
    ],
  },
  // Étape 7 — domaines d'engagement.
  {
    id: "domaine_engagement",
    route: "/quiz/domaine-engagement",
    title: "Quels domaines t’intéressent ?",
    options: [
      "domaine_engagement.sante_bien_etre",
      "domaine_engagement.sport",
      "domaine_engagement.solidarite_inclusion",
      "domaine_engagement.environnement_animaux",
      "domaine_engagement.art_culture",
      "domaine_engagement.securite_secours",
      "domaine_engagement.citoyennete",
      "domaine_engagement.numerique",
      "domaine_engagement.education",
    ],
  },
  // Étape 8 — activités.
  {
    id: "activite",
    route: "/quiz/activite",
    title: "Qu’aimerais-tu faire concrètement ?",
    options: [
      "activite.aider_accompagner",
      "activite.transmettre_animer",
      "activite.fabriquer_reparer_terrain",
      "activite.secourir_proteger",
      "activite.organiser_coordonner",
      "activite.creer_communiquer",
    ],
  },
  // Étape 9 — équipe.
  {
    id: "equipe",
    route: "/quiz/equipe",
    title: "Dans quel type d’équipe te sentirais-tu le plus à l’aise ?",
    options: ["equipe.autonomie", "equipe.petit_groupe", "equipe.grand_collectif", "equipe.peu_importe"],
  },
  // Étape 10 — interaction.
  {
    id: "interaction",
    route: "/quiz/interaction",
    title: "Comment préfères-tu participer ?",
    options: ["interaction.interaction_collective", "interaction.equilibre_collectif_autonomie", "interaction.autonomie_principale", "interaction.peu_importe"],
  },
  // Étape 11 — autonomie.
  {
    id: "autonomie",
    route: "/quiz/autonomie",
    title: "Quel cadre te conviendrait le mieux ?",
    options: ["autonomie.organisation_libre", "autonomie.accompagnement_initial", "autonomie.cadre_suivi_regulier", "autonomie.je_ne_sais_pas"],
  },
  // Étape 12 — imprévu.
  {
    id: "imprevu",
    route: "/quiz/imprevu",
    title: "Quel niveau d’imprévu te conviendrait le mieux ?",
    options: ["imprevu.adaptation_rapide", "imprevu.imprevu_modere", "imprevu.cadre_previsible", "imprevu.je_ne_sais_pas"],
  },
];
