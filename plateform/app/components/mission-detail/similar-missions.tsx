import { useEffect, useRef, useState } from "react";

import MissionCard from "~/components/missions/mission-card";
import { fetchMatches } from "~/services/matching";
import type { BrowseMission } from "~/types/api";
import type { MatchResultItem } from "~/types/matching";

interface Props {
  userScoringId: string;
  currentMissionId: string;
}

function toBrowseMission(item: MatchResultItem): BrowseMission {
  return {
    id: item.mission.id,
    title: item.mission.title,
    description: null,
    city: item.mission.location.city,
    departmentCode: null,
    departmentName: null,
    domain: item.mission.domain,
    domainOriginal: item.mission.domainOriginal ?? null,
    domainLogo: item.mission.media.domainLogo,
    organizationName: item.mission.organizationName,
    organizationLogo: item.mission.media.organizationLogo,
    photo: item.mission.media.photo,
    publisherName: item.mission.publisherName,
    publisherLogo: item.mission.media.publisherLogo,
    applicationUrl: null,
    schedule: item.mission.schedule,
  };
}

export default function SimilarMissions({ userScoringId, currentMissionId }: Props) {
  const [items, setItems] = useState<MatchResultItem[]>([]);
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
    <section className="fr-background-alt--blue-france px-5 py-10 md:px-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="fr-h4 mb-0!">
            Découvre <span className="text-highlighted">ta sélection</span> de missions
          </h2>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => scrollBy(-1)}
              className="slider-arrow fr-btn fr-btn--secondary fr-btn--icon-only fr-icon-arrow-left-s-line"
              aria-label="Précédent"
            />
            <button type="button" onClick={() => scrollBy(1)} className="slider-arrow fr-btn fr-btn--secondary fr-btn--icon-only fr-icon-arrow-right-s-line" aria-label="Suivant" />
          </div>
        </div>

        <div ref={scrollRef} className="flex snap-x snap-mandatory gap-5 overflow-x-auto pb-2 scrollbar-none">
          {items.map((item) => (
            <div key={item.mission.id} className="w-[280px] flex-none snap-start md:w-[283px]">
              <MissionCard mission={toBrowseMission(item)} to={`/results/${userScoringId}/missions/${item.mission.id}`} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
