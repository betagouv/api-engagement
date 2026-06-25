import type { MissionMatchItem } from "@engagement/dto";
import { Suspense, lazy } from "react";

const MissionMap = lazy(() => import("~/components/results/mission-map"));

interface LazyMissionMapProps {
  items: MissionMatchItem[];
  center: [number, number];
  onMarkerClick?: (item: MissionMatchItem) => void;
  selectionPadding?: [number, number];
  activeMissionId?: string | null;
  onMissionHover?: (missionId: string | null) => void;
}

export default function LazyMissionMap({ items, center, onMarkerClick, selectionPadding, activeMissionId, onMissionHover }: LazyMissionMapProps) {
  return (
    <Suspense fallback={<div className="h-full fr-background-alt--grey" />}>
      <MissionMap items={items} center={center} onMarkerClick={onMarkerClick} selectionPadding={selectionPadding} activeMissionId={activeMissionId} onMissionHover={onMissionHover} />
    </Suspense>
  );
}
