import { Link } from "react-router";

// Présentation unique des cartes mission (résultats de matching, liste /missions, landings) : image
// sans surimpression, tag domaine, titre, tags et annonceur, plus un bouton email optionnel. Seul le
// lien « Détails » mène à la fiche (retour SIG : pas d'action sur le visuel ni de carte cliquable).
// Les appelants n'ont pas les mêmes données (matching vs browse) ni le même tracking : la carte ne
// reçoit que du déjà mis en forme et ne calcule ni les tags ni le lien.
export default function MissionCard({
  image,
  domainLabel,
  title,
  to,
  state,
  onClick,
  tags,
  publisherName,
  publisherLogo,
  onEmailClick,
  badge,
}: {
  image: string | null;
  domainLabel: string | null;
  title: string;
  to?: string;
  state?: unknown;
  onClick?: () => void;
  tags?: string[];
  publisherName: string | null;
  publisherLogo: string | null;
  onEmailClick?: () => void;
  // Nature de la mission affichée sur le visuel : indemnisée (volontariats, réserves) ou bénévole.
  badge?: "indemnisee" | "benevole" | null;
}) {
  return (
    // Sans tags (cartes d'exemple des landings) : hauteur au contenu et titre plus grand, sur 3 lignes.
    <div className={`border-border-default-grey bg-background shadow-card flex w-full flex-col border ${tags ? "h-89.75" : "h-full"}`}>
      <div className="relative">
        {image ? <img className="h-30 w-full object-cover" src={image} alt="" loading="lazy" /> : <div className="bg-beige-gris-galet h-30 w-full" />}
        {badge === "indemnisee" && <p className="fr-badge fr-badge--sm fr-badge--success fr-badge--no-icon absolute! top-2 left-2">Indemnisée</p>}
        {badge === "benevole" && <p className="fr-badge fr-badge--sm fr-badge--error fr-badge--no-icon absolute! top-2 left-2">Bénévole</p>}
      </div>

      <div className="relative flex flex-1 flex-col px-4 py-3 gap-4">
        {/* Cœur en absolute au-dessus du titre : le titre garde toute la largeur de la carte. */}
        {onEmailClick && (
          <button
            type="button"
            className="fr-btn fr-btn--tertiary fr-btn--sm fr-icon-heart-line absolute! top-2 right-4 w-8! h-8! text-xs!"
            title="Recevoir cette mission par e-mail"
            onClick={onEmailClick}
          >
            Recevoir cette mission par e-mail
          </button>
        )}
        <div className="flex min-w-0 flex-col gap-2">
          {domainLabel && (
            <span
              title={domainLabel}
              className={`bg-action-low-blue-france text-blue-france-sun rounded-full px-2.5 block leading-4! text-xs uppercase w-fit! ${onEmailClick ? "max-w-[calc(100%-2.5rem)]" : "max-w-full"}`}
            >
              {domainLabel}
            </span>
          )}
          {/* title : intitulé complet au survol quand il dépasse les 3 lignes. */}
          <h3 title={title} className={`text-blue-france-sun! m-0! font-bold! line-clamp-3 ${tags ? "text-base!" : "text-xl! leading-7!"} ${onEmailClick ? "mt-1!" : ""}`}>
            {title}
          </h3>
        </div>

        {tags && (
          <div className="flex mt-auto flex-1 max-h-14 flex-wrap content-start gap-2 overflow-hidden">
            {tags.map((tag) => (
              <span key={tag} className="bg-(--background-contrast-grey) text-label-grey flex max-w-full items-center rounded-full px-2.5 py-0.5 text-xs!">
                {tag}
              </span>
            ))}
          </div>
        )}

        <div className="mt-auto flex items-center justify-between gap-3">
          {/* RGAA 1.1: if the publisher has no name, don't display the logo */}
          {publisherName ? (
            <div className="text-mention-grey flex min-w-0 items-center gap-2 text-sm">
              {publisherLogo && <img src={publisherLogo} alt="" aria-hidden="true" className="h-8 max-w-12 bg-white object-contain" loading="lazy" />}
              <span className="line-clamp-1">{publisherName}</span>
            </div>
          ) : (
            <span />
          )}
          {to && (
            <Link to={to} state={state} onClick={onClick} className="fr-link fr-icon-arrow-right-line fr-link--icon-right shrink-0">
              Détails<span className="fr-sr-only"> de la mission : {title}</span>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
