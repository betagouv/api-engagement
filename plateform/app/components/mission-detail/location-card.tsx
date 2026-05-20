import { Suspense, lazy } from "react";
import type { MissionDetailLocation } from "@engagement/dto";

const LocationMap = lazy(() => import("~/components/ui/location-map"));

interface MissionLocationCardProps {
  location: MissionDetailLocation;
}

export default function MissionLocationCard({ location }: MissionLocationCardProps) {
  const locationDisplay = location.address ?? location.city;
  const locationLat = location.lat;
  const locationLon = location.lon;
  const hasLocationCoordinates = locationLat != null && locationLon != null;

  if (!locationDisplay) return null;

  return (
    <section className="fr-card fr-card--no-arrow overflow-hidden">
      {hasLocationCoordinates && (
        <Suspense fallback={<div className="h-[180px] w-full bg-[#f0f0f0]" />}>
          <LocationMap lat={locationLat} lon={locationLon} />
        </Suspense>
      )}

      <div className="fr-card__body">
        <div className="fr-card__content">
          <div className="flex items-start gap-4">
            <i className="fr-icon-map-pin-2-line fr-icon--sm mt-0.5 flex-none text-mention-grey" aria-hidden="true" />
            <p className="fr-mb-0 flex flex-col gap-2">
              {location.city && <span className="font-bold text-title-grey">{location.city}</span>}
              {location.address && <span className="fr-text--sm text-mention-grey">{location.address}</span>}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
