import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { MapContainer, Marker, TileLayer } from "react-leaflet";
import { MAPTILER_API_KEY } from "~/services/config";

export const MAPTILER_BASIC_URL = MAPTILER_API_KEY ? `https://api.maptiler.com/maps/basic-v2/256/{z}/{x}/{y}.png?key=${MAPTILER_API_KEY}` : null;
export const MAPTILER_ATTRIBUTION =
  '<a href="https://www.maptiler.com/copyright/" target="_blank">&copy; MapTiler</a> <a href="https://www.openstreetmap.org/copyright" target="_blank">&copy; OpenStreetMap contributors</a>';

export const TILE_LAYER_PROPS = {
  attribution: MAPTILER_API_KEY ? MAPTILER_ATTRIBUTION : '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  crossOrigin: true as const,
  maxZoom: 20,
  minZoom: 1,
  url: MAPTILER_BASIC_URL ?? "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
};

export const createEmojiIcon = (emoji: string) =>
  L.divIcon({
    className: "",
    html: `<div class="mission-map__emoji-marker">${emoji}</div>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
    popupAnchor: [0, -12],
  });

const pinIcon = createEmojiIcon("📍");

interface LocationMapProps {
  lat: number;
  lon: number;
  zoom?: number;
  className?: string;
}

export default function LocationMap({ lat, lon, zoom = 15, className = "h-[180px] w-full" }: LocationMapProps) {
  return (
    <MapContainer center={[lat, lon]} zoom={zoom} className={className} zoomControl={false} scrollWheelZoom={false} dragging={false} doubleClickZoom={false}>
      <TileLayer {...TILE_LAYER_PROPS} />
      <Marker position={[lat, lon]} icon={pinIcon} />
    </MapContainer>
  );
}
