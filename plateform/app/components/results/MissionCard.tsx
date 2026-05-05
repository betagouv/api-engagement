import type { MatchResultItem } from "~/types/matching";

const DOMAIN_COLORS = [
  "from-blue-400 to-blue-600",
  "from-emerald-400 to-emerald-600",
  "from-violet-400 to-violet-600",
  "from-orange-400 to-orange-600",
  "from-rose-400 to-rose-600",
];

interface Props {
  item: MatchResultItem;
  index: number;
}

export default function MissionCard({ item, index }: Props) {
  const gradientClass = DOMAIN_COLORS[index % DOMAIN_COLORS.length];
  const organizationName = item.organizationName ?? item.publisherName;

  return (
    <div className="flex flex-col overflow-hidden rounded-xl bg-white shadow-md">
      <div className={`relative h-44 bg-gradient-to-br ${gradientClass}`}>
        {item.photo && <img src={item.photo} alt="" className="h-full w-full object-cover" loading="lazy" />}
        {item.domain && <span className="absolute left-3 top-3 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-gray-700">{item.domain}</span>}
      </div>

      {/* Card body */}
      <div className="flex flex-1 flex-col gap-2 p-4">
        <p className="line-clamp-3 text-base font-bold leading-snug text-gray-900">{item.title}</p>

        <div className="flex flex-col gap-1 text-sm text-gray-600">
          {item.city && (
            <span className="flex items-center gap-1.5">
              <i className="fr-icon-map-pin-2-line fr-icon--sm" aria-hidden="true" />
              {item.city}
            </span>
          )}
          {item.schedule && (
            <span className="flex items-center gap-1.5">
              <i className="fr-icon-time-line fr-icon--sm" aria-hidden="true" />
              {item.schedule}
            </span>
          )}
          {organizationName && (
            <span className="flex items-center gap-1.5">
              <i className="fr-icon-building-line fr-icon--sm" aria-hidden="true" />
              <span className="line-clamp-1">{organizationName}</span>
            </span>
          )}
        </div>

        {/* Publisher footer */}
        {item.distanceKm != null && <p className="mt-auto pt-2 text-xs text-gray-400">{Math.round(item.distanceKm)} km</p>}
      </div>
    </div>
  );
}
