import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { MissionMatchItem } from "@engagement/dto";
import { useEffect, useId, useMemo } from "react";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import { TILE_LAYER_PROPS, createEmojiIcon } from "~/components/ui/location-map";
import { type GeoPosition, getNearbyPosition } from "~/utils/geo";

type MapMission = {
  item: MissionMatchItem;
  position: GeoPosition;
  addressLabel: string | null;
  usesRemoteIcon: boolean;
};

const classicIcon = createEmojiIcon("📍");
const remoteIcon = createEmojiIcon("👨‍💻");

const getAddressLabel = (item: MissionMatchItem): string | null => item.mission.location.closestAddress ?? item.mission.location.city;

function spreadOverlappingPositions(missions: MapMission[]): MapMission[] {
  const positionCounts = new Map<string, number>();

  return missions.map((mission) => {
    const key = mission.position.join(",");
    const index = positionCounts.get(key) ?? 0;
    positionCounts.set(key, index + 1);

    if (index === 0) return mission;

    return {
      ...mission,
      position: getNearbyPosition(mission.position, mission.item.mission.id, index),
    };
  });
}

function BoundsFitter({ positions }: { positions: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (positions.length === 0) return;
    map.fitBounds(L.latLngBounds(positions), { padding: [64, 64], maxZoom: 13 });
  }, [map, positions]);
  return null;
}

interface Props {
  items: MissionMatchItem[];
  center: [number, number];
  onMarkerClick?: (item: MissionMatchItem) => void;
}

export default function MissionMap({ items, center, onMarkerClick }: Props) {
  const missions = useMemo<MapMission[]>(
    () => {
      const positionedMissions = items.map((item, index) => {
        const hasPreciseCoordinates = item.mission.remote !== "full" && typeof item.mission.location.closestLat === "number" && typeof item.mission.location.closestLon === "number";
        const addressLabel = item.mission.remote !== "full" ? getAddressLabel(item) : null;
        const position: GeoPosition = hasPreciseCoordinates
          ? [item.mission.location.closestLat!, item.mission.location.closestLon!]
          : getNearbyPosition(center, item.mission.id, index);

        return {
          item,
          addressLabel,
          position,
          usesRemoteIcon: item.mission.remote === "full" || (!hasPreciseCoordinates && !addressLabel),
        };
      });

      return spreadOverlappingPositions(positionedMissions);
    },
    [center, items],
  );

  const boundsPositions = missions.length > 0 ? missions.map((mission) => mission.position) : [center];

  const descriptionId = useId();
  const accessibleLabel = `Carte des ${items.length} mission${items.length > 1 ? "s" : ""} proposée${items.length > 1 ? "s" : ""}`;

  return (
    <div role="region" aria-label={accessibleLabel} aria-describedby={descriptionId} className="relative h-full w-full">
      <p id={descriptionId} className="sr-only">
        Carte interactive localisant les missions proposées. La liste des missions présente les mêmes informations sous forme textuelle accessible.
      </p>
      <MapContainer center={center} zoom={12} className="mission-map" zoomControl={false}>
        <TileLayer {...TILE_LAYER_PROPS} />
        <BoundsFitter positions={boundsPositions} />
        {missions.map(({ item, position, addressLabel, usesRemoteIcon }) => (
          <Marker
            key={item.mission.id}
            position={position}
            icon={usesRemoteIcon ? remoteIcon : classicIcon}
            eventHandlers={onMarkerClick ? { click: () => onMarkerClick(item) } : undefined}
          >
            {!onMarkerClick && (
              <Popup>
                <strong>{item.mission.title}</strong>
                {addressLabel && (
                  <>
                    <br />
                    {addressLabel}
                  </>
                )}
                {!addressLabel && (
                  <>
                    <br />
                    Mission à distance ou sans adresse précise
                  </>
                )}
              </Popup>
            )}
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
