import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/_index.tsx"),

  // Nouveau quiz — flow conditionnel, un step = une route, layout partagé.
  route("quiz", "routes/quiz/_layout.tsx", [
    index("routes/quiz/_index.tsx"),
    route("age", "routes/quiz/age.tsx"),
    route("handicap", "routes/quiz/handicap.tsx"),
    route("statut", "routes/quiz/statut.tsx"),
    route("localisation", "routes/quiz/localisation.tsx"),
    route("duree", "routes/quiz/duree.tsx"),
    route("motivation", "routes/quiz/motivation.tsx"),
    route("precision-domaine-aide", "routes/quiz/precision-domaine-aide.tsx"),
    route("precision-parcoursup-formation", "routes/quiz/precision-parcoursup-formation.tsx"),
    route("precision-parcoursup-formation-nom", "routes/quiz/precision-parcoursup-formation-nom.tsx"),
    route("precision-domaine", "routes/quiz/precision-domaine.tsx"),
    route("precision-formation-onisep", "routes/quiz/precision-formation-onisep.tsx"),
    route("precision-competences", "routes/quiz/precision-competences.tsx"),
    route("precision-reprendre-activite", "routes/quiz/precision-reprendre-activite.tsx"),
    route("precision-servir-pays", "routes/quiz/precision-servir-pays.tsx"),
    route("precision-international", "routes/quiz/precision-international.tsx"),
    route("results", "routes/quiz/results.tsx"),
  ]),

  route("missions", "routes/missions.tsx"),
] satisfies RouteConfig;
