import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/_index.tsx"),

  // Facade publique SSR : ces routes signent les appels backend avec PUBLISHER_API_KEY sans exposer la cle au navigateur.
  route("api/missions/browse", "routes/api.missions.browse.ts"),
  route("api/missions/browse/:id", "routes/api.missions.browse.$id.ts"),
  route("api/missions/match", "routes/api.missions.match.ts"),
  route("api/user-scoring", "routes/api.user-scoring.ts"),
  route("api/user-scoring/:id", "routes/api.user-scoring.$id.ts"),
  route("api/email/mission", "routes/api.email.mission.ts"),
  route("api/newsletter", "routes/api.newsletter.ts"),

  // Quiz — flow conditionnel, un step = une route, layout partagé.
  // Les steps de toutes les versions du parcours restent enregistrés (cf. config/quiz-flow) ;
  // seule la version active (QUIZ_FLOW_VERSION) pilote la navigation.
  route("quiz", "routes/quiz/_layout.tsx", [
    index("routes/quiz/_index.tsx"),
    // Steps du parcours v2 (q2).
    route("age", "routes/quiz/age.tsx"),
    route("handicap", "routes/quiz/handicap.tsx"),
    route("localisation", "routes/quiz/localisation.tsx"),
    route("mobilite", "routes/quiz/mobilite.tsx"),
    route("motivation-recherche", "routes/quiz/motivation-recherche.tsx"),
    route("rythme", "routes/quiz/rythme.tsx"),
    route("domaine-engagement", "routes/quiz/domaine-engagement.tsx"),
    route("activite", "routes/quiz/activite.tsx"),
    route("equipe", "routes/quiz/equipe.tsx"),
    route("interaction", "routes/quiz/interaction.tsx"),
    route("autonomie", "routes/quiz/autonomie.tsx"),
    route("imprevu", "routes/quiz/imprevu.tsx"),
    // Steps du parcours v1 (q1), conservés pour rollback.
    route("statut", "routes/quiz/statut.tsx"),
    route("duree", "routes/quiz/duree.tsx"),
    route("motivation", "routes/quiz/motivation.tsx"),
    route("precision-thematique", "routes/quiz/precision-thematique.tsx"),
    route("precision-parcoursup-formation", "routes/quiz/precision-parcoursup-formation.tsx"),
    route("precision-parcoursup-formation-nom", "routes/quiz/precision-parcoursup-formation-nom.tsx"),
    route("precision-domaine", "routes/quiz/precision-domaine.tsx"),
    route("precision-formation-onisep", "routes/quiz/precision-formation-onisep.tsx"),
    route("precision-competences", "routes/quiz/precision-competences.tsx"),
    route("precision-reprendre-activite", "routes/quiz/precision-reprendre-activite.tsx"),
    route("precision-servir-pays", "routes/quiz/precision-servir-pays.tsx"),
    route("precision-international", "routes/quiz/precision-international.tsx"),
  ]),

  // Pages légales et informatives, liées depuis le footer.
  route("plan-du-site", "routes/plan-du-site.tsx"),
  route("accessibilite", "routes/accessibilite.tsx"),
  route("mentions-legales", "routes/mentions-legales.tsx"),
  route("politique-de-confidentialite", "routes/politique-de-confidentialite.tsx"),

  route("results/:userScoringId", "routes/results.tsx"),
  route("results/:userScoringId/missions/:missionId", "routes/mission-detail.tsx", { id: "mission-detail-from-results" }),
  route("missions/:missionId", "routes/mission-detail.tsx", { id: "mission-detail-standalone" }),
  route("missions", "routes/missions.tsx"),
] satisfies RouteConfig;
