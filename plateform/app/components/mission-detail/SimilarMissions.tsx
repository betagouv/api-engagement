import { useEffect, useRef, useState } from "react";

import { fetchMatches } from "~/services/matching";
import type { MatchResultItem } from "~/types/matching";
import MissionCard from "../results/MissionCard";

interface Props {
  userScoringId: string;
  currentMissionId: string;
  city?: string | null;
}

export default function SimilarMissions({ userScoringId, currentMissionId, city }: Props) {
  const [items, setItems] = useState<MatchResultItem[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchMatches(userScoringId, 8, 0)
      .then((res) => setItems(res.items.filter((item) => item.mission.id !== currentMissionId).slice(0, 4)))
      .catch(() => {});
  }, [userScoringId, currentMissionId]);

  if (items.length === 0) return null;

  const scrollBy = (direction: -1 | 1) => {
    scrollRef.current?.scrollBy({ left: direction * 300, behavior: "smooth" });
  };

  return (
    <section className="bg-[#F5F5FE] px-5 py-10 md:px-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold">Des missions similaires{city ? ` à ${city}` : ""}</h2>
          <div className="hidden gap-2 md:flex">
            <button
              type="button"
              onClick={() => scrollBy(-1)}
              className="flex h-10 w-10 items-center justify-center border border-[#000091] text-[#000091] hover:bg-[#f5f5ff]"
              aria-label="Précédent"
            >
              <i className="fr-icon-arrow-left-s-line" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => scrollBy(1)}
              className="flex h-10 w-10 items-center justify-center border border-[#000091] text-[#000091] hover:bg-[#f5f5ff]"
              aria-label="Suivant"
            >
              <i className="fr-icon-arrow-right-s-line" aria-hidden="true" />
            </button>
          </div>
        </div>

        <div ref={scrollRef} className="flex snap-x snap-mandatory gap-5 overflow-x-auto pb-2 scrollbar-none">
          {items.map((item, i) => (
            <div key={item.mission.id} className="w-[280px] flex-none snap-start md:w-[283px]">
              <MissionCard item={item} index={i} userScoringId={userScoringId} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
