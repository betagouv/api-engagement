import { useEffect, useState } from "react";

import type { MissionMatchItem } from "@engagement/dto";
import MatchMissionCard from "~/components/missions/match-mission-card";
import Carousel from "~/components/ui/carousel";
import Highlight from "~/components/ui/highlight";
import { fetchInitialMatches } from "~/services/matching";
import { userValueKeysFromScoring } from "~/utils/mission";

interface Props {
  userScoringId: string;
  currentMissionId: string;
}

export default function SimilarMissions({ userScoringId, currentMissionId }: Props) {
  const [items, setItems] = useState<MissionMatchItem[]>([]);
  const [userValueKeys, setUserValueKeys] = useState<ReadonlySet<string>>(() => new Set());

  useEffect(() => {
    fetchInitialMatches(userScoringId)
      .then((res) => {
        setItems(res.items.filter((item) => item.mission.id !== currentMissionId).slice(0, 10));
        setUserValueKeys(userValueKeysFromScoring(res.userValues ?? []));
      })
      .catch(() => {});
  }, [userScoringId, currentMissionId]);

  if (items.length === 0) return null;

  return (
    <section className="fr-background-alt--blue-france overflow-x-clip px-5 py-10 pb-28 md:px-6 md:pb-10">
      <div className="mx-auto max-w-7xl">
        <Carousel
          label="Ta sélection de missions"
          header={
            <h2 className="fr-h4 mb-0!">
              Découvre <Highlight>ta sélection</Highlight> de missions
            </h2>
          }
          previousLabel="Voir les missions précédentes"
          nextLabel="Voir les missions suivantes"
          listClassName="-ml-32! scroll-pl-32! pl-32! mr-[calc(50%-50vw)]!"
          itemClassName="w-[85vw] max-w-[384px] md:w-[384px]"
        >
          {items.map((item, index) => (
            <MatchMissionCard key={item.mission.id} item={item} section="similar" rank={index + 1} userScoringId={userScoringId} userValueKeys={userValueKeys} />
          ))}
        </Carousel>
      </div>
    </section>
  );
}
