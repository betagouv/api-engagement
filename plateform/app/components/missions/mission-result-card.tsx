import { Link } from "react-router";

import MissionTag from "./mission-tag";

// Présentation de la carte mission des résultats : image + badge domaine, titre cliquable (zone
// étendue à toute la carte via `fr-enlarge-link`), tags et annonceur, plus un bouton email optionnel.
// Les appelants n'ont pas les mêmes données (matching vs browse) ni le même tracking : la carte ne
// reçoit que du déjà mis en forme et ne calcule ni les tags ni le lien.
export default function MissionResultCard({
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
    <div className="fr-enlarge-link border-border-default-grey bg-background shadow-card relative flex h-full w-full flex-col border">
      {image ? <img className="h-[120px] w-full object-cover" src={image} alt="" loading="lazy" /> : <div className="bg-beige-gris-galet h-[120px] w-full" />}

      {domainLabel && <p className="fr-badge fr-badge--sm fr-badge--purple-glycine absolute top-3 left-3 z-1 m-0! px-[6px]! text-[12px]!">{domainLabel}</p>}

      {onEmailClick && (
        <button
          type="button"
          className="bg-background! hover:bg-background-default-grey-hover! hover:ring-blue-france-sun absolute top-[9px] right-[9px] z-10 flex h-[25px] w-[25px] items-center justify-center rounded-full shadow-[0_0_24px_0_rgba(0,0,18,0.12)] hover:ring-1"
          onClick={(e) => {
            // La carte entière est un lien (`fr-enlarge-link`) : sans ça le clic ouvrirait la mission.
            e.preventDefault();
            e.stopPropagation();
            onEmailClick();
          }}
          aria-label="Recevoir par email"
        >
          <i className="fr-icon-mail-send-line fr-icon--sm text-blue-france-sun" aria-hidden="true" />
        </button>
      )}

      <div className="flex flex-1 flex-col gap-4 px-4 py-3">
        <h3 className="m-0! text-[16px]! leading-tight!">
          <Link
            to={to}
            state={state}
            onClick={onClick}
            className="text-title-grey! fr-h6! bg-none! mb-0!"
            style={{ display: "-webkit-box", WebkitBoxOrient: "vertical" as const, WebkitLineClamp: 2, overflow: "hidden" }}
          >
            {title}
          </Link>
        </h3>

        <div className="flex h-[76px] flex-wrap content-start gap-2 overflow-hidden">
          {tags.map((tag) => (
            <MissionTag key={tag}>{tag}</MissionTag>
          ))}
        </div>

        {/* RGAA 1.1: if the publisher has no name, don't display the logo */}
        {publisherName && (
          <div className="text-mention-grey mt-auto flex items-center gap-2 text-xs">
            {publisherLogo && <img src={publisherLogo} alt="" aria-hidden="true" className="h-8 max-w-20 rounded-lg bg-white object-contain" loading="lazy" />}
            <span className="line-clamp-1">{publisherName}</span>
          </div>
        )}
      </div>
    </div>
  );
}
