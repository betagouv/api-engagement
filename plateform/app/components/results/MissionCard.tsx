import type { MatchResultItem } from "~/types/matching";

interface Props {
  item: MatchResultItem;
  index: number;
  onDebugClick?: (item: MatchResultItem) => void;
}

export default function MissionCard({ item, index, onDebugClick }: Props) {
  const organizationName = item.mission.organizationName ?? item.mission.publisherName;
  const publisherName = item.mission.publisherName;
  const publisherLogo = item.mission.media.publisherLogo;

  return (
    <article className="mission-card flex min-h-[430px] flex-col overflow-hidden">
      <div className="mission-card__media relative h-40 sm:h-44">
        {item.mission.media.photo && <img src={item.mission.media.photo} alt="" className="h-full w-full object-cover" loading={index < 5 ? "eager" : "lazy"} />}
      </div>

      <div className="mission-card__body flex flex-1 flex-col px-5 py-6 sm:px-7 sm:py-7">
        {item.mission.domain && (
          <span className="mission-card__badge mb-5 w-fit rounded-full px-4 py-2 text-sm font-medium leading-none">{item.mission.domain}</span>
        )}

        <h3 className="mission-card__title line-clamp-4 text-xl font-bold leading-snug sm:text-[1.6rem]">{item.mission.title}</h3>

        <div className="mission-card__meta mt-7 flex flex-col gap-3 text-base leading-tight">
          {item.mission.location.city && (
            <span className="flex items-center gap-3">
              <i className="fr-icon-map-pin-2-line text-[1.35rem]" aria-hidden="true" />
              {item.mission.location.city}
            </span>
          )}
          {item.mission.schedule && (
            <span className="flex items-center gap-3">
              <i className="fr-icon-time-line text-[1.35rem]" aria-hidden="true" />
              {item.mission.schedule}
            </span>
          )}
          {organizationName && (
            <span className="flex items-center gap-3">
              <i className="fr-icon-building-line text-[1.35rem]" aria-hidden="true" />
              <span className="line-clamp-1">{organizationName}</span>
            </span>
          )}
        </div>

        {(publisherName || publisherLogo) && (
          <div className="mission-card__publisher mt-auto flex items-center justify-end gap-2 pt-8 text-right text-xs leading-tight sm:text-sm">
            {publisherName && <span className="line-clamp-2 max-w-[8rem] sm:max-w-[10rem]">{publisherName}</span>}
            {publisherLogo && <img src={publisherLogo} alt="" className="max-h-8 max-w-[4.75rem] object-contain sm:max-h-9 sm:max-w-[5.25rem]" loading="lazy" />}
          </div>
        )}

        {onDebugClick && (
          <button type="button" className="mission-card__debug-button" onClick={() => onDebugClick(item)} aria-label={`Débuguer le matching de ${item.mission.title}`}>
            <i className="fr-icon-settings-5-line fr-icon--sm" aria-hidden="true" />
          </button>
        )}
      </div>
    </article>
  );
}
