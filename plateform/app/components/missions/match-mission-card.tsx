import type { MissionMatchItem } from "@engagement/dto";
import { getDomainLabel } from "@engagement/dto";
import { useMemo } from "react";

import { getTaxonomyValue } from "~/config/quiz-options";
import { trackMissionClickedFromMatch } from "~/services/tracking/events";
import type { MissionDetailEntrySource, MissionDetailNavState } from "~/services/tracking/types";
import { useQuizStore } from "~/stores/quiz";
import { buildMissionDetailHref, buildMissionMatchTags } from "~/utils/mission";
import MissionCard from "./mission-card";

// Sections de résultats (matching) et leur entry_source de fiche détail correspondante.
// `similar` n'a pas de provenance détail dédiée (→ pas de nav state, resolve en "direct").
type MatchSection = "pinned" | "other" | "similar";
const DETAIL_ENTRY_SOURCE_BY_SECTION: Record<Exclude<MatchSection, "similar">, MissionDetailEntrySource> = {
  pinned: "results_pinned",
  other: "results_other",
};

// Carte mission issue d'un résultat de matching : tags résumant le matching et bouton "Recevoir par
// email" optionnel. Instrumentation : `mission.clicked` au clic + transmission de l'entry_source/rank
// à la fiche détail (pour `mission_detail.viewed`). Le rendu vit dans `MissionCard`.
export default function MatchMissionCard({
  item,
  section,
  rank,
  userScoringId,
  onEmailClick,
}: {
  item: MissionMatchItem;
  section: MatchSection;
  rank: number;
  userScoringId?: string;
  onEmailClick?: (missionId: string) => void;
}) {
  const { mission } = item;
  const answers = useQuizStore((s) => s.answers);

  // Clés plates "taxonomie.valeur" des réponses du quiz : les tags ne retiennent que les valeurs
  // de la mission que l'utilisateur a effectivement demandées.
  const userValueKeys = useMemo(
    () =>
      new Set(
        Object.values(answers).flatMap((answer) =>
          answer?.type === "options" ? answer.option_ids.map((optionId) => `${answer.taxonomy}.${getTaxonomyValue(answer.taxonomy, optionId)}`) : [],
        ),
      ),
    [answers],
  );

  const entrySource = section === "similar" ? undefined : DETAIL_ENTRY_SOURCE_BY_SECTION[section];
  const state: MissionDetailNavState | undefined = entrySource ? { entrySource, rank } : undefined;

  return (
    <MissionCard
      image={mission.media.photo ?? mission.media.organizationLogo ?? mission.media.domainLogo}
      domainLabel={getDomainLabel(mission.domain)}
      title={mission.title}
      to={buildMissionDetailHref(item, userScoringId)}
      state={state}
      onClick={() => trackMissionClickedFromMatch(item, { section, entryPage: "results", rank })}
      tags={buildMissionMatchTags(item, userValueKeys)}
      publisherName={mission.publisherName}
      publisherLogo={mission.media.publisherLogo}
      onEmailClick={onEmailClick ? () => onEmailClick(mission.id) : undefined}
    />
  );
}
