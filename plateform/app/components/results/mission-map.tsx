import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { MissionMatchItem } from "@engagement/dto";
import { useEffect, useId, useMemo, useRef } from "react";
import { MapContainer, Marker, Popup, TileLayer, Tooltip, ZoomControl, useMap } from "react-leaflet";
import { TILE_LAYER_PROPS, createEmojiIcon } from "~/components/ui/location-map";
import { type GeoPosition, getNearbyPosition } from "~/utils/geo";

type MapMission = {
  item: MissionMatchItem;
  position: GeoPosition;
  addressLabel: string | null;
  icon: L.DivIcon;
};

const activeIcon = L.divIcon({
  className: "",
  html: `<div class="mission-map__emoji-marker mission-map__emoji-marker--active" role="img" aria-label="Mission sélectionnée">📍</div>`,
  iconSize: [22, 22],
  iconAnchor: [11, 11],
  popupAnchor: [0, -12],
});

const getAddressLabel = (item: MissionMatchItem): string | null => item.mission.location.closestAddress ?? item.mission.location.city;
const hasNeutralizedAddress = (item: MissionMatchItem): boolean => item.mission.remote === "full" || item.mission.remote === "local";
const getFallbackAddressLabel = (item: MissionMatchItem): string => (item.mission.remote === "full" ? "Mission à distance" : "Mission sans adresse précise");

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
  // Marge (x, y en px) à garder dégagée à droite/en bas pour que le pin cliqué ne passe pas sous la carte mission.
  selectionPadding?: [number, number];
  // Mission actuellement survolée/sélectionnée : son pin est mis en couleur et passe au premier plan.
  activeMissionId?: string | null;
  // Survol d'un pin → remonte l'id (ou null) pour surligner la carte correspondante dans la liste.
  onMissionHover?: (missionId: string | null) => void;
}

export default function MissionMap({ items, center, onMarkerClick, selectionPadding, activeMissionId, onMissionHover }: Props) {
  const mapRef = useRef<L.Map | null>(null);

  // RGAA 10.13 : le contenu additionnel affiché au survol/focus doit pouvoir être masqué à la touche Échap.
  useEffect(() => {
    const closeTooltipsOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      mapRef.current?.eachLayer((layer) => {
        if (layer instanceof L.Marker) layer.closeTooltip();
      });
    };
    document.addEventListener("keydown", closeTooltipsOnEscape);
    return () => document.removeEventListener("keydown", closeTooltipsOnEscape);
  }, []);

  const handleMarkerSelect = (item: MissionMatchItem, position: GeoPosition) => {
    if (selectionPadding && mapRef.current) mapRef.current.panInside(position, { paddingBottomRight: selectionPadding });
    onMarkerClick?.(item);
  };

  const missions = useMemo<MapMission[]>(() => {
    const positionedMissions = items.map((item, index) => {
      const addressNeutralized = hasNeutralizedAddress(item);
      const hasPreciseCoordinates = !addressNeutralized && typeof item.mission.location.closestLat === "number" && typeof item.mission.location.closestLon === "number";
      const addressLabel = !addressNeutralized ? getAddressLabel(item) : null;
      const position: GeoPosition = hasPreciseCoordinates
        ? [item.mission.location.closestLat!, item.mission.location.closestLon!]
        : getNearbyPosition(center, item.mission.id, index);

      const usesRemoteIcon = item.mission.remote === "full" || (!hasPreciseCoordinates && !addressLabel && item.mission.remote !== "local");
      const markerLabel = usesRemoteIcon ? "Mission à distance" : item.mission.location.city ? `Mission à ${item.mission.location.city}` : "Mission en présentiel";

      return {
        item,
        addressLabel,
        position,
        icon: createEmojiIcon(usesRemoteIcon ? "👨‍💻" : "📍", markerLabel),
      };
    });

    return spreadOverlappingPositions(positionedMissions);
  }, [center, items]);

  const boundsPositions = useMemo<[number, number][]>(() => (missions.length > 0 ? missions.map((mission) => mission.position) : [center]), [missions, center]);

  const descriptionId = useId();
  const accessibleLabel = `Carte des ${items.length} mission${items.length > 1 ? "s" : ""} proposée${items.length > 1 ? "s" : ""}`;

  return (
    <div role="region" aria-label={accessibleLabel} aria-describedby={descriptionId} className="relative h-full w-full">
      <p id={descriptionId} className="sr-only">
        Carte interactive localisant les missions proposées. La liste des missions présente les mêmes informations sous forme textuelle accessible.
      </p>
      <MapContainer ref={mapRef} center={center} zoom={12} className="mission-map" zoomControl={false}>
        {/* RGAA 13.10 : alternative en pointage simple au zoom par pincement (geste multipoint). */}
        <ZoomControl zoomInTitle="Zoomer" zoomOutTitle="Dézoomer" />
        <TileLayer {...TILE_LAYER_PROPS} />
        <BoundsFitter positions={boundsPositions} />
        {missions.map(({ item, position, addressLabel, icon }) => {
          const isActive = item.mission.id === activeMissionId;
          return (
            <Marker
              key={item.mission.id}
              position={position}
              icon={isActive ? activeIcon : icon}
              zIndexOffset={isActive ? 1000 : 0}
              keyboard={false}
              eventHandlers={{
                ...(onMarkerClick ? { click: () => handleMarkerSelect(item, position) } : {}),
                ...(onMissionHover ? { mouseover: () => onMissionHover(item.mission.id), mouseout: () => onMissionHover(null) } : {}),
              }}
            >
              {onMissionHover && (
                <Tooltip interactive direction="top" offset={[0, -8]} opacity={1} className="mission-map__tooltip">
                  <strong className="mission-map__tooltip-title">{item.mission.title}</strong>
                  <span className="mission-map__tooltip-address">{addressLabel ?? getFallbackAddressLabel(item)}</span>
                </Tooltip>
              )}
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
                      {getFallbackAddressLabel(item)}
                    </>
                  )}
                </Popup>
              )}
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}
