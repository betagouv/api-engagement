import { Link } from "react-router";

export default function QuizHeader() {
  return (
    <header role="banner" className="fr-header">
      <div className="header-shadow tw:flex tw:items-center! tw:gap-4 tw:justify-center! tw:relative tw:py-3 tw:bg-raised-grey">
        <Link
          to="/"
          title="Retour à l'accueil"
          className="fr-icon-arrow-left-line fr-btn--icon-left tw:p-4 tw:text-sm tw:text-blue-france-sun! tw:font-semi-bold! tw:absolute tw:left-0 tw:top-0"
        >
          Retour
        </Link>
        <p className="fr-h5 tw:after:none">Trouve ta mission</p>
      </div>
    </header>
  );
}
