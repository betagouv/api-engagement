interface SpinnerProps {
  label?: string;
  labelHidden?: boolean;
  className?: string;
}

// Indicateur de chargement. L'anneau est purement décoratif (`aria-hidden`) : l'information est
// portée par le texte, annoncé par les lecteurs d'écran grâce au `role="status"` (RGAA 1.2 et 7.4).
// RGAA 13.8 : la rotation est neutralisée par la règle `prefers-reduced-motion` globale (main.css).
// Le libellé reste alors le seul indicateur, d'où un texte toujours rendu (visible ou `fr-sr-only`).
export default function Spinner({ label = "Chargement…", labelHidden = false, className = "" }: SpinnerProps) {
  return (
    <div role="status" className={`flex items-center gap-3 ${className}`}>
      <span aria-hidden="true" className="h-8 w-8 shrink-0 animate-spin rounded-full border-2 border-blue-france-925 border-t-blue-france-sun" />
      <span className={labelHidden ? "fr-sr-only" : "fr-text--sm text-mention-grey mb-0!"}>{label}</span>
    </div>
  );
}
