import type { MissionDetailLocation } from "@engagement/dto";
import { Suspense, lazy } from "react";

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

  const mapsQuery = hasLocationCoordinates ? `${locationLat},${locationLon}` : (location.address ?? location.city ?? "");
  const mapsHref = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapsQuery)}`;

  return (
    <section className="md:shadow-card md:overflow-hidden bg-background p-0!">
      {hasLocationCoordinates && (
        <Suspense fallback={<div className="hidden h-[180px] w-full bg-[#f0f0f0] md:block" />}>
          <div className="hidden md:block">
            <LocationMap lat={locationLat} lon={locationLon} />
          </div>
        </Suspense>
      )}

      <div className="flex flex-col gap-4 px-5! md:p-12!">
        <hr className="h-px! pb-0! bg-border-default-grey! -mx-5! md:hidden! bg-none!" />
        <div className="flex items-start gap-4">
          <i className="fr-icon-map-pin-2-line fr-icon--sm text-mention-grey mt-0.5 flex-none" aria-hidden="true" />
          <p className="fr-mb-0 flex flex-col gap-2">
            {location.city && <span className="text-title-grey font-bold">{location.city}</span>}
            {location.address && <span className="fr-text--sm text-mention-grey mb-0!">{location.address}</span>}
          </p>
        </div>

        <a
          href={mapsHref}
          target="_blank"
          rel="noopener noreferrer"
          className="fr-btn fr-btn--secondary fr-icon-map-pin-2-line fr-btn--icon-left w-full! justify-center! md:hidden!"
        >
          Ouvrir sur Google Maps
        </a>
      </div>
    </section>
  );
}
