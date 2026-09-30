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
}: {
  image: string | null;
  domainLabel: string | null;
  title: string;
  to: string;
  state?: unknown;
  onClick?: () => void;
  tags: string[];
  publisherName: string | null;
  publisherLogo: string | null;
  onEmailClick?: () => void;
}) {
  return (
    <div className="border-border-default-grey bg-background shadow-card flex h-83.75 w-full flex-col border">
      {image ? <img className="h-30 w-full object-cover" src={image} alt="" loading="lazy" /> : <div className="bg-beige-gris-galet h-30 w-full" />}

      <div className="relative flex flex-1 flex-col px-4 py-3 gap-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-col gap-2">
            {domainLabel && (
              <span className="bg-action-low-blue-france text-blue-france-sun rounded-full px-2.5 h-4 flex items-center leading-0! text-xs uppercase w-fit!">{domainLabel}</span>
            )}
            <h3 className="text-blue-france-sun! m-0! line-clamp-2 text-base! font-bold!">{title}</h3>
          </div>
          {onEmailClick && (
            <button
              type="button"
              className="fr-btn fr-btn--tertiary fr-btn--sm fr-icon-heart-line shrink-0 w-8! h-8! text-xs!"
              title="Recevoir cette mission par e-mail"
              onClick={onEmailClick}
            >
              Recevoir cette mission par e-mail
            </button>
          )}
        </div>

        <div className="flex mt-auto flex-1 max-h-14 flex-wrap content-start gap-2 overflow-hidden">
          {tags.map((tag) => (
            <span key={tag} className="bg-(--background-contrast-grey) text-label-grey flex items-center rounded-full px-2.5 py-0.5 text-xs! whitespace-nowrap">
              {tag}
            </span>
          ))}
        </div>

        <div className="flex items-center justify-between gap-3">
          {/* RGAA 1.1: if the publisher has no name, don't display the logo */}
          {publisherName ? (
            <div className="text-mention-grey flex min-w-0 items-center gap-2 text-sm">
              {publisherLogo && <img src={publisherLogo} alt="" aria-hidden="true" className="h-8 max-w-12 bg-white object-contain" loading="lazy" />}
              <span className="line-clamp-1">{publisherName}</span>
            </div>
          ) : (
            <span />
          )}
          <Link to={to} state={state} onClick={onClick} className="fr-link fr-icon-arrow-right-line fr-link--icon-right shrink-0">
            Détails<span className="fr-sr-only"> de la mission : {title}</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
