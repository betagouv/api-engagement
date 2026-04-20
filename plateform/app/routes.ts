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
    route("motivation-lyceen", "routes/quiz/motivation-lyceen.tsx"),
    route("motivation-etudiant", "routes/quiz/motivation-etudiant.tsx"),
    route("motivation-demandeur-emploi", "routes/quiz/motivation-demandeur-emploi.tsx"),
    route("motivation-actif", "routes/quiz/motivation-actif.tsx"),
    route("motivation-autres", "routes/quiz/motivation-autres.tsx"),
    route("results", "routes/quiz/results.tsx"),
  ]),

  route("missions", "routes/missions.tsx"),
] satisfies RouteConfig;
