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
    route("precision-domaine-aide", "routes/quiz/precision-domaine-aide.tsx"),
    route("precision-parcoursup-formation", "routes/quiz/precision-parcoursup-formation.tsx"),
    route("precision-parcoursup-formation-nom", "routes/quiz/precision-parcoursup-formation-nom.tsx"),
    route("precision-parcoursup-domaine", "routes/quiz/precision-parcoursup-domaine.tsx"),
    route("precision-orientation-rome", "routes/quiz/precision-orientation-rome.tsx"),
    route("precision-competences", "routes/quiz/precision-competences.tsx"),
    route("precision-competences-actuelles", "routes/quiz/precision-competences-actuelles.tsx"),
    route("precision-decouvrir-domaine", "routes/quiz/precision-decouvrir-domaine.tsx"),
    route("precision-experience-terrain", "routes/quiz/precision-experience-terrain.tsx"),
    route("precision-reprendre-activite", "routes/quiz/precision-reprendre-activite.tsx"),
    route("precision-reconversion", "routes/quiz/precision-reconversion.tsx"),
    route("precision-indecision", "routes/quiz/precision-indecision.tsx"),
    route("precision-servir-pays", "routes/quiz/precision-servir-pays.tsx"),
    route("precision-international", "routes/quiz/precision-international.tsx"),
    route("results", "routes/quiz/results.tsx"),
  ]),

  route("missions", "routes/missions.tsx"),
] satisfies RouteConfig;
