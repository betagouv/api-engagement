import { Link } from "react-router";

export default function BackButton({ href }: { href: string }) {
  return (
    <Link to={href} title="Retour" className="fr-icon-arrow-left-line fr-btn--icon-left fr-btn--tertiary-no-outline tw:font-bold! tw:w-fit! tw:bg-none!">
      Retour
    </Link>
  );
}
