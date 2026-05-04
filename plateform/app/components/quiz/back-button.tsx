import { Link } from "react-router";

export default function BackButton({ href }: { href: string }) {
  return (
    <Link to={href} title="Retour" className="fr-icon-arrow-left-line fr-btn--icon-left fr-btn--tertiary-no-outline font-bold! w-fit! bg-none!">
      Retour
    </Link>
  );
}
