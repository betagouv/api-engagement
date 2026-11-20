import { Link } from "react-router";

export default function BackButton({ href, onBack, className = "" }: { href: string; onBack?: () => void; className?: string }) {
  return (
    <Link to={href} onClick={onBack} className={`fr-btn fr-btn--lg fr-btn--secondary ${className}`}>
      Précédent
    </Link>
  );
}
