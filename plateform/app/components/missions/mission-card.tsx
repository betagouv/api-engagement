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
    <div className="border-border-default-grey bg-background shadow-card flex h-full w-full flex-col border">
      {image ? <img className="h-[120px] w-full object-cover" src={image} alt="" loading="lazy" /> : <div className="bg-beige-gris-galet h-[120px] w-full" />}

      <div className="flex flex-1 flex-col gap-4 px-4 py-3">
        <div className="flex items-start gap-2">
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            {domainLabel && <p className="fr-tag fr-tag--sm m-0!">{domainLabel}</p>}
            <h3
              className="text-blue-france-sun! m-0! text-[16px]! leading-6!"
              style={{ display: "-webkit-box", WebkitBoxOrient: "vertical" as const, WebkitLineClamp: 2, overflow: "hidden" }}
            >
              {title}
            </h3>
          </div>
          {onEmailClick && (
            <button type="button" className="fr-btn fr-btn--tertiary fr-btn--sm fr-icon-heart-line shrink-0" title="Recevoir cette mission par e-mail" onClick={onEmailClick}>
              Recevoir cette mission par e-mail
            </button>
          )}
        </div>

        <div className="flex h-[56px] flex-wrap content-start gap-2 overflow-hidden">
          {tags.map((tag) => (
            <p key={tag} className="fr-tag fr-tag--sm bg-(--background-contrast-grey)! text-title-grey! m-0!">
              {tag}
            </p>
          ))}
        </div>

        <div className="mt-auto flex items-center justify-between gap-2">
          {/* RGAA 1.1: if the publisher has no name, don't display the logo */}
          {publisherName ? (
            <div className="text-mention-grey flex min-w-0 items-center gap-2 text-xs">
              {publisherLogo && <img src={publisherLogo} alt="" aria-hidden="true" className="h-[25px] max-w-11 bg-white object-contain" loading="lazy" />}
              <span className="line-clamp-1">{publisherName}</span>
            </div>
          ) : (
            <span />
          )}
          <Link to={to} state={state} onClick={onClick} className="fr-link fr-link--sm fr-icon-arrow-right-line fr-link--icon-right shrink-0">
            Détails<span className="fr-sr-only"> de la mission : {title}</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
