import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect, useMemo } from "react";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import type { MatchResultItem } from "~/types/matching";

const CLASSIC_MARKER = "📍";
const REMOTE_MARKER = "👨‍💻";

type MapMission = {
  item: MatchResultItem;
  position: [number, number];
  hasRealAddress: boolean;
};

const createEmojiIcon = (emoji: string) =>
  L.divIcon({
    className: "",
    html: `<div style="
      width: 54px;
      height: 54px;
      display: grid;
      place-items: center;
      border: 4px solid #fff;
      border-radius: 9999px;
      background: rgba(246, 246, 255, 0.92);
      box-shadow: 0 6px 18px rgba(0, 0, 0, 0.18);
      font-size: 26px;
      line-height: 1;
    ">${emoji}</div>`,
    iconSize: [54, 54],
    iconAnchor: [27, 27],
    popupAnchor: [0, -28],
  });

const classicIcon = createEmojiIcon(CLASSIC_MARKER);
const remoteIcon = createEmojiIcon(REMOTE_MARKER);

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

const getAddressLabel = (item: MatchResultItem): string | null => item.closestAddress ?? item.city;

function BoundsFitter({ positions }: { positions: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (positions.length === 0) return;
    map.fitBounds(L.latLngBounds(positions), { padding: [40, 40] });
  }, [map, positions]);
  return null;
}

interface Props {
  items: MatchResultItem[];
  center: [number, number];
}

export default function MissionMap({ items, center }: Props) {
  const missions = useMemo<MapMission[]>(
    () =>
      items.map((item, index) => {
        const hasRealAddress = item.remote !== "full" && item.closestLat !== null && item.closestLon !== null;
        const position: [number, number] = hasRealAddress ? [item.closestLat!, item.closestLon!] : getNearbyPosition(center, item.missionId, index);

        return {
          item,
          hasRealAddress,
          position,
        };
      }),
    [center, items]
  );

  const boundsPositions = missions.length > 0 ? missions.map((mission) => mission.position) : [center];

  return (
    <MapContainer center={center} zoom={12} style={{ height: "100%", width: "100%" }} zoomControl={true}>
      <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <BoundsFitter positions={boundsPositions} />
      {missions.map(({ item, position, hasRealAddress }) => (
        <Marker key={item.missionId} position={position} icon={hasRealAddress ? classicIcon : remoteIcon}>
          <Popup>
            <strong>{item.title}</strong>
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
        </Marker>
      ))}
    </MapContainer>
  );
}
