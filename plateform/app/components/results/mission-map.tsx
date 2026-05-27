import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect, useMemo } from "react";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import { TILE_LAYER_PROPS, createEmojiIcon } from "~/components/ui/location-map";
import type { MissionMatchItem } from "@engagement/dto";

type MapMission = {
  item: MissionMatchItem;
  position: [number, number];
  hasRealAddress: boolean;
};

const classicIcon = createEmojiIcon("📍");
const remoteIcon = createEmojiIcon("👨‍💻");

const hashString = (value: string): number => {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return hash;
};

const getNearbyPosition = (center: [number, number], seed: string, index: number): [number, number] => {
  const hash = hashString(`${seed}-${index}`);
  const angle = ((hash % 360) * Math.PI) / 180;
  const radiusKm = 0.8 + ((hash >>> 8) % 25) / 10;
  const latDelta = (Math.cos(angle) * radiusKm) / 111;
  const lonDelta = (Math.sin(angle) * radiusKm) / (111 * Math.max(Math.cos((center[0] * Math.PI) / 180), 0.1));

  return [center[0] + latDelta, center[1] + lonDelta];
};

const getAddressLabel = (item: MissionMatchItem): string | null => item.mission.location.closestAddress ?? item.mission.location.city;

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
    () =>
      items.map((item, index) => {
        const hasRealAddress = item.mission.remote !== "full" && item.mission.location.closestLat !== null && item.mission.location.closestLon !== null;
        const position: [number, number] = hasRealAddress
          ? [item.mission.location.closestLat!, item.mission.location.closestLon!]
          : getNearbyPosition(center, item.mission.id, index);

        return {
          item,
          hasRealAddress,
          position,
        };
      }),
    [center, items],
  );

  const boundsPositions = missions.length > 0 ? missions.map((mission) => mission.position) : [center];

  return (
    <MapContainer center={center} zoom={12} className="mission-map" zoomControl={false}>
      <TileLayer {...TILE_LAYER_PROPS} />
      <BoundsFitter positions={boundsPositions} />
      {missions.map(({ item, position, hasRealAddress }) => (
        <Marker
          key={item.mission.id}
          position={position}
          icon={hasRealAddress ? classicIcon : remoteIcon}
          eventHandlers={onMarkerClick ? { click: () => onMarkerClick(item) } : undefined}
        >
          {!onMarkerClick && (
            <Popup>
              <strong>{item.mission.title}</strong>
              {hasRealAddress && getAddressLabel(item) && (
                <>
                  <br />
                  {getAddressLabel(item)}
                </>
              )}
              {!hasRealAddress && (
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
  );
}
