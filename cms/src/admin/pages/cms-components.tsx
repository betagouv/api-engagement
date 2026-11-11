// Composants du CMS, rendus par plateform (vrais composants, DSFR) et affiché ici en iframe : l'admin Strapi tourne sur
// React 18, les blocs de plateform sur React 19. `/api/cms-components` redirige vers plateform (PLATEFORM_URL, lu au
// démarrage du serveur : pas d'URL figée dans le build de l'admin).
const CmsComponents = () => <iframe title="Composants du CMS" src="/api/cms-components" style={{ display: "block", width: "100%", height: "100vh", border: 0 }} />;

export default CmsComponents;
