// Redirection vers le catalogue des blocs de plateform, affiché en iframe dans l'admin (cf. src/admin/app.tsx).
// Publique : elle ne fait que renvoyer vers une page elle-même publique.
export default {
  routes: [
    {
      method: "GET",
      path: "/catalogue-blocs",
      handler: "catalogue-blocs.redirect",
      config: { auth: false },
    },
  ],
};
