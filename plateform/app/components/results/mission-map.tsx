import type { MissionMatchItem } from "@engagement/dto";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect, useId, useMemo, useRef } from "react";
import { AttributionControl, MapContainer, Marker, Popup, TileLayer, ZoomControl, useMap } from "react-leaflet";
import { TILE_LAYER_PROPS } from "~/components/ui/location-map";
import { useIsMobile } from "~/hooks/useIsMobile";
import { type GeoPosition, getNearbyPosition } from "~/utils/geo";

type MapMission = {
  item: MissionMatchItem;
  position: GeoPosition;
  addressLabel: string | null;
  icon: L.DivIcon;
  activeIcon: L.DivIcon;
};

const createPinIcon = (iconClass: string, ariaLabel: string, active = false) =>
  L.divIcon({
    className: "",
    html: `<div class="mission-map__pin${active ? " mission-map__pin--active" : ""}" role="img" aria-label="${ariaLabel}"><span class="${iconClass} fr-icon--sm" aria-hidden="true"></span></div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    popupAnchor: [0, -16],
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
  // Marge (x, y en px) à garder dégagée en haut/à gauche pour que le pin cliqué ne passe pas sous la carte mission fixée.
  selectionPadding?: [number, number];
  // Mission actuellement survolée/sélectionnée : son pin est mis en couleur et passe au premier plan.
  activeMissionId?: string | null;
  // Survol d'un pin → remonte l'id (ou null) : surligne la carte correspondante dans la liste
  // et affiche la carte mission en overlay sur la map (rendu par la page résultats).
  onMissionHover?: (missionId: string | null) => void;
}

export default function MissionMap({ items, center, onMarkerClick, selectionPadding, activeMissionId, onMissionHover }: Props) {
  const mapRef = useRef<L.Map | null>(null);
  const isMobile = useIsMobile();

  const handleMarkerSelect = (item: MissionMatchItem, position: GeoPosition) => {
    if (selectionPadding && mapRef.current) mapRef.current.panInside(position, { paddingTopLeft: selectionPadding });
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
      const iconClass = usesRemoteIcon ? "fr-icon-computer-fill" : "fr-icon-map-pin-2-fill";

      return {
        item,
        addressLabel,
        position,
        icon: createPinIcon(iconClass, markerLabel),
        activeIcon: createPinIcon(iconClass, markerLabel, true),
      };
    });

    return spreadOverlappingPositions(positionedMissions);
  }, [center, items]);

  const boundsPositions = useMemo<[number, number][]>(() => (missions.length > 0 ? missions.map((mission) => mission.position) : [center]), [missions, center]);

  const handleRecenter = () => {
    mapRef.current?.fitBounds(L.latLngBounds(boundsPositions), { padding: [64, 64], maxZoom: 13 });
  };

  const descriptionId = useId();
  const accessibleLabel = `Carte des ${items.length} mission${items.length > 1 ? "s" : ""} proposée${items.length > 1 ? "s" : ""}`;

  return (
    <div role="region" aria-label={accessibleLabel} aria-describedby={descriptionId} className="relative h-full w-full">
      <p id={descriptionId} className="sr-only">
        Carte interactive localisant les missions proposées. La liste des missions présente les mêmes informations sous forme textuelle accessible.
      </p>
      <MapContainer ref={mapRef} center={center} zoom={12} className="mission-map" zoomControl={false} attributionControl={false}>
        {/* RGAA 13.10 : alternative en pointage simple au zoom par pincement (geste multipoint).
            Mobile : en haut à droite (le carrousel de cartes occupe le bas de la map). */}
        <ZoomControl position={isMobile ? "topright" : "bottomright"} zoomInTitle="Zoomer" zoomOutTitle="Dézoomer" />
        {/* Attribution à gauche pour laisser les contrôles zoom + recentrage seuls en bas à droite.
            Sans préfixe « Leaflet » ; les crédits MapTiler/OSM restent obligatoires (conditions MapTiler + licence ODbL). */}
        <AttributionControl position="bottomleft" prefix={false} />
        <TileLayer {...TILE_LAYER_PROPS} />
        <BoundsFitter positions={boundsPositions} />
        {missions.map(({ item, position, addressLabel, icon, activeIcon }) => {
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

      {/* Recentrage sur l'ensemble des pins (même cadrage que BoundsFitter). Sous le zoom : en haut à droite sur mobile, en bas à droite sur desktop. */}
      <button type="button" onClick={handleRecenter} aria-label="Recentrer la carte sur les missions" className="mission-map__recenter">
        <span className="fr-icon-focus-3-fill fr-icon--sm" aria-hidden="true"></span>
      </button>
    </div>
  );
}
