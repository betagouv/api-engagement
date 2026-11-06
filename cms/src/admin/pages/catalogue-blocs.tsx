// Catalogue des blocs, rendu par plateform (vrais composants, DSFR) et affiché ici en iframe : l'admin Strapi tourne sur
// React 18, les blocs de plateform sur React 19. `/api/catalogue-blocs` redirige vers plateform (PLATEFORM_URL, lu au
// démarrage du serveur : pas d'URL figée dans le build de l'admin).
const CatalogueBlocs = () => <iframe title="Catalogue des blocs du CMS" src="/api/catalogue-blocs" style={{ display: "block", width: "100%", height: "100vh", border: 0 }} />;

export default CatalogueBlocs;
