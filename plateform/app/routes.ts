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

  // Nouveau quiz — flow conditionnel, un step = une route, layout partagé.
  route("quiz", "routes/quiz/_layout.tsx", [
    index("routes/quiz/_index.tsx"),
    route("age", "routes/quiz/age.tsx"),
    route("handicap", "routes/quiz/handicap.tsx"),
    route("localisation", "routes/quiz/localisation.tsx"),
    route("mobilite", "routes/quiz/mobilite.tsx"),
    route("motivations", "routes/quiz/motivations.tsx"),
    route("rythme", "routes/quiz/rythme.tsx"),
    route("domaines", "routes/quiz/domaines.tsx"),
    route("activites", "routes/quiz/activites.tsx"),
    route("equipe", "routes/quiz/equipe.tsx"),
    route("interaction", "routes/quiz/interaction.tsx"),
    route("autonomie", "routes/quiz/autonomie.tsx"),
    route("imprevu", "routes/quiz/imprevu.tsx"),
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
