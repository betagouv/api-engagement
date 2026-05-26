import type { MissionMatchItem } from "@engagement/dto";
import { Suspense, lazy } from "react";

const MissionMap = lazy(() => import("~/components/results/mission-map"));

interface LazyMissionMapProps {
  items: MissionMatchItem[];
  center: [number, number];
}

export default function LazyMissionMap({ items, center }: LazyMissionMapProps) {
  return (
    <Suspense fallback={<div className="h-full fr-background-alt--grey" />}>
      <MissionMap items={items} center={center} />
    </Suspense>
  );
}
