import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/_index.tsx"),
  route("quiz/:slug", "routes/quiz.$slug.tsx"),
  route("missions", "routes/missions.tsx"),
] satisfies RouteConfig;
