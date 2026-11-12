// Redirection vers le page des composants du CMS (plateform), affiché en iframe dans l'admin (cf. src/admin/app.tsx).
// Publique : elle ne fait que renvoyer vers une page elle-même publique.
export default {
  routes: [
    {
      method: "GET",
      path: "/cms-components",
      handler: "cms-components.redirect",
      config: { auth: false },
    },
  ],
};
