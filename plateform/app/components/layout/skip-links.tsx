// Liens d'évitement DSFR (RGAA 12.7). Doit rester le premier élément focusable du <body>.
// Pas de lien « Menu » : le site n'a pas de menu de navigation à cibler.
export default function SkipLinks() {
  return (
    <div className="fr-skiplinks">
      <nav className="fr-container" role="navigation" aria-label="Accès rapide">
        <ul className="fr-skiplinks__list">
          <li>
            <a className="fr-link" href="#contenu">
              Contenu
            </a>
          </li>
          <li>
            <a className="fr-link" href="#footer">
              Pied de page
            </a>
          </li>
        </ul>
      </nav>
    </div>
  );
}
