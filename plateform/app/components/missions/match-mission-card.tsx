import type { MissionMatchItem } from "@engagement/dto";
import { getDomainLabel } from "@engagement/dto";
import { useMemo } from "react";
import { Link } from "react-router";

import { trackMissionClickedFromMatch } from "~/services/tracking/events";
import type { MissionDetailEntrySource, MissionDetailNavState } from "~/services/tracking/types";
import { useQuizStore } from "~/stores/quiz";
import { buildMissionDetailHref, buildMissionMatchTags } from "~/utils/mission";
import MissionTag from "./mission-tag";

// Sections de résultats (matching) et leur entry_source de fiche détail correspondante.
// `similar` n'a pas de provenance détail dédiée (→ pas de nav state, resolve en "direct").
type MatchSection = "pinned" | "other" | "similar";
const DETAIL_ENTRY_SOURCE_BY_SECTION: Record<Exclude<MatchSection, "similar">, MissionDetailEntrySource> = {
  pinned: "results_pinned",
  other: "results_other",
};

// Carte mission issue d'un résultat de matching : badge domaine sur l'image, tags résumant le
// matching et bouton "Recevoir par email" optionnel. Instrumentation : `mission.clicked` au clic
// + transmission de l'entry_source/rank à la fiche détail (pour `mission_detail.viewed`).
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
    () => new Set(Object.values(answers).flatMap((answer) => (answer?.type === "options" ? answer.option_ids.map((optionId) => `${answer.taxonomy}.${optionId}`) : []))),
    [answers],
  );
  const tags = buildMissionMatchTags(item, userValueKeys);

  const entrySource = section === "similar" ? undefined : DETAIL_ENTRY_SOURCE_BY_SECTION[section];
  const state: MissionDetailNavState | undefined = entrySource ? { entrySource, rank } : undefined;

  const domainLabel = getDomainLabel(mission.domain);
  const cardImage = mission.media.photo ?? mission.media.organizationLogo ?? mission.media.domainLogo;

  return (
    <div className="fr-enlarge-link border-border-default-grey bg-background relative flex h-full w-full flex-col border shadow-card">
      {cardImage ? <img className="h-[120px] w-full object-cover" src={cardImage} alt="" loading="lazy" /> : <div className="bg-beige-gris-galet h-[120px] w-full" />}

      {domainLabel && <p className="fr-badge fr-badge--sm fr-badge--purple-glycine absolute top-3 left-3 z-1 m-0! px-[6px]! text-[12px]!">{domainLabel}</p>}

      {onEmailClick && (
        <button
          type="button"
          className="bg-background! absolute top-[9px] right-[9px] z-10 flex h-[25px] w-[25px] items-center justify-center rounded-full shadow-[0_0_24px_0_rgba(0,0,18,0.12)] hover:bg-background-default-grey-hover! hover:ring-1 hover:ring-blue-france-sun"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onEmailClick(mission.id);
          }}
          aria-label="Recevoir par email"
        >
          <i className="fr-icon-mail-send-line fr-icon--sm text-blue-france-sun" aria-hidden="true" />
        </button>
      )}

      <div className="flex flex-1 flex-col gap-4 px-4 py-3">
        <h3 className="m-0! text-[16px]! leading-tight!">
          <Link
            to={buildMissionDetailHref(item, userScoringId)}
            state={state}
            onClick={() => trackMissionClickedFromMatch(item, { section, entryPage: "results", rank })}
            className="text-title-grey! fr-h6! bg-none! mb-0!"
            style={{ display: "-webkit-box", WebkitBoxOrient: "vertical" as const, WebkitLineClamp: 2, overflow: "hidden" }}
          >
            {mission.title}
          </Link>
        </h3>

        <div className="h-[76px] flex flex-wrap content-start gap-2 overflow-hidden">
          {tags.map((tag) => (
            <MissionTag key={tag}>{tag}</MissionTag>
          ))}
        </div>

        {/* RGAA 1.1: if the publisher has no name, don't display the logo */}
        {mission.publisherName && (
          <div className="text-mention-grey mt-auto flex items-center gap-2 text-xs">
            {mission.media.publisherLogo && <img src={mission.media.publisherLogo} alt="" aria-hidden="true" className="h-8 max-w-20 object-contain" loading="lazy" />}
            <span className="line-clamp-1">{mission.publisherName}</span>
          </div>
        )}
      </div>
    </div>
  );
}
