// Environnement courant (ENV), lu au runtime : l'admin est buildé une fois, ENV n'est pas dans son bundle.
// Publique : n'expose que le nom de l'environnement.
export default {
  routes: [{ method: "GET", path: "/environment", handler: "environment.get", config: { auth: false } }],
};
