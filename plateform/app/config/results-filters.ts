import type { StepId } from "~/config/quiz-flow";
import type { QuizOptionKey } from "~/config/quiz-options";

// Un filtre = une question du quiz (steps q2, nommés comme leur taxonomy). Le tag affiche la
// réponse courante (bleu plein) ou un libellé générique si la question est sans réponse (bleu clair).
// Les listes d'options reprennent celles des steps correspondants (app/routes/quiz/*.tsx), sans les
// options neutres (« Je ne sais pas », « Peu importe ») qui n'ont pas de sens comme filtre.
export type ResultsFilterDef = {
  stepId: StepId;
  // Libellé de la question pour les intitulés accessibles (bouton du tag, bouton Effacer).
  label: string;
  // Libellé du tag quand la question n'a pas de réponse, repris comme titre du panneau.
  placeholder: string;
  optionKeys: QuizOptionKey[];
  single?: boolean;
};

export const FILTERS: ResultsFilterDef[] = [
  {
    stepId: "rythme",
    label: "le rythme",
    placeholder: "Ton rythme",
    optionKeys: [
      "rythme.ponctuelle_journee",
      "rythme.quelques_heures_semaine",
      "rythme.plusieurs_jours_semaine",
      "rythme.quelques_jours_annee",
      "rythme.temps_plein_plusieurs_mois",
    ],
  },
  {
    stepId: "domaine_engagement",
    label: "les domaines",
    placeholder: "Tes domaines",
    optionKeys: [
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
  {
    stepId: "mobilite",
    label: "la mobilité",
    placeholder: "Ta mobilité",
    optionKeys: ["mobilite.pied_transports", "mobilite.velo", "mobilite.voiture"],
  },
  {
    stepId: "activite",
    label: "les activités",
    placeholder: "Tes activités",
    optionKeys: [
      "activite.aider_accompagner",
      "activite.transmettre_animer",
      "activite.fabriquer_reparer_terrain",
      "activite.secourir_proteger",
      "activite.organiser_coordonner",
      "activite.creer_communiquer",
    ],
  },
  {
    stepId: "equipe",
    label: "l’équipe",
    placeholder: "Ton équipe",
    single: true,
    optionKeys: ["equipe.autonomie", "equipe.petit_groupe", "equipe.grand_collectif"],
  },
  {
    stepId: "interaction",
    label: "la participation",
    placeholder: "Ta participation",
    single: true,
    optionKeys: ["interaction.interaction_collective", "interaction.equilibre_collectif_autonomie", "interaction.autonomie_principale"],
  },
  {
    stepId: "autonomie",
    label: "l’accompagnement",
    placeholder: "Ton cadre",
    single: true,
    optionKeys: ["autonomie.organisation_libre", "autonomie.accompagnement_initial", "autonomie.cadre_suivi_regulier"],
  },
  {
    stepId: "imprevu",
    label: "les imprévus",
    placeholder: "Ton niveau d’imprévu",
    single: true,
    optionKeys: ["imprevu.adaptation_rapide", "imprevu.imprevu_modere", "imprevu.cadre_previsible"],
  },
];

export const FILTER_STEP_IDS = new Set<StepId>(FILTERS.map((filter) => filter.stepId));
