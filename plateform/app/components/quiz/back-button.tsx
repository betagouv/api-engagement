import { Link } from "react-router";

export default function BackButton({ href, onBack }: { href: string; onBack?: () => void }) {
  return (
    <Link to={href} onClick={onBack} title="Retour" className="fr-icon-arrow-left-line fr-btn--icon-left fr-btn--tertiary-no-outline font-bold! w-fit! bg-none!">
      Retour
    </Link>
  );
}
