import { useEffect, useRef, useState } from "react";

import type { MissionMatchItem } from "@engagement/dto";
import MissionCard from "~/components/missions/mission-card";
import Highlight from "~/components/ui/highlight";
import { fetchMatches } from "~/services/matching";
import { buildMissionDetailHref, matchResultToBrowseMission } from "~/utils/mission";

interface Props {
  userScoringId: string;
  currentMissionId: string;
}

export default function SimilarMissions({ userScoringId, currentMissionId }: Props) {
  const [items, setItems] = useState<MissionMatchItem[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchMatches(userScoringId, 11, 0)
      .then((res) => setItems(res.items.filter((item) => item.mission.id !== currentMissionId).slice(0, 10)))
      .catch(() => {});
  }, [userScoringId, currentMissionId]);

  if (items.length === 0) return null;

  const scrollBy = (direction: -1 | 1) => {
    scrollRef.current?.scrollBy({ left: direction * 300, behavior: "smooth" });
  };

  return (
    <section className="fr-background-alt--blue-france px-5 py-10 pb-28 md:px-6 md:pb-10">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="fr-h4 mb-0!">
            Découvre <Highlight>ta sélection</Highlight> de missions
          </h2>
          <div className="hidden gap-3 md:flex">
            <NavButtons onScroll={scrollBy} />
          </div>
        </div>

        <div ref={scrollRef} className="flex snap-x snap-mandatory gap-5 overflow-x-auto pb-2 scrollbar-none">
          {items.map((item) => (
            <div key={item.mission.id} className="w-[310px] flex-none snap-start md:w-[283px]">
              <MissionCard mission={matchResultToBrowseMission(item)} link={{ type: "internal", to: buildMissionDetailHref(item, userScoringId) }} />
            </div>
          ))}
        </div>

        <div className="mt-6 flex justify-center gap-3 md:hidden">
          <NavButtons onScroll={scrollBy} />
        </div>
      </div>
    </section>
  );
}

function NavButtons({ onScroll }: { onScroll: (direction: -1 | 1) => void }) {
  return (
    <>
      <button
        type="button"
        onClick={() => onScroll(-1)}
        className="fr-btn fr-btn--secondary fr-btn--icon-only fr-icon-arrow-left-s-line size-10! justify-center! items-center! p-0! rounded-full!"
        aria-label="Précédent"
      />
      <button
        type="button"
        onClick={() => onScroll(1)}
        className="fr-btn fr-btn--secondary fr-btn--icon-only fr-icon-arrow-right-s-line size-10! justify-center! items-center! p-0! rounded-full!"
        aria-label="Suivant"
      />
    </>
  );
}
