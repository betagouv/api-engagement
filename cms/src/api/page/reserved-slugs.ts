// Premiers segments d'URL déjà servis par plateform (cf. plateform/app/routes.ts) : un slug qui commencerait par l'un d'eux
// serait masqué par la route existante. Un test côté plateform vérifie que cette liste couvre routes.ts.
export const RESERVED_SLUGS = [
  "accessibilite",
  "accompagnateurs",
  "api",
  "mentions-legales",
  "missions",
  "pages",
  "plan-du-site",
  "politique-de-confidentialite",
  "quiz",
  "results",
  "robots.txt",
  "sitemap.xml",
  "statistiques",
  "_cms",
];
