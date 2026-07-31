import type { TaxonomyValueKey } from "@engagement/taxonomy";
import { useEffect, useMemo, useState } from "react";
import { OPTIONS } from "~/config/quiz-options";
import { fetchInitialMatches } from "~/services/matching";
import { useQuizStore } from "~/stores/quiz";

type Props = {
  onComplete: () => void;
};

// Steps résumés à l'écran, dans l'ordre d'affichage (la localisation est traitée à part).
const RECAP_STEP_IDS = ["motivations", "rythme", "domaines", "activites", "equipe"] as const;

// Délai entre l'apparition de deux points du récap.
const REVEAL_INTERVAL_MS = 500;

// Attente après l'apparition du dernier point avant de naviguer vers les résultats.
const REVEAL_END_MS = 2000;

export default function LoadingRecap({ onComplete }: Props) {
  const answers = useQuizStore((state) => state.answers);
  const [visibleCount, setVisibleCount] = useState(0);
  const [revealEnded, setRevealEnded] = useState(false);
  const [matchesLoaded, setMatchesLoaded] = useState(false);

  // Une ligne par question ; les réponses multiples d'une même question
  // sont regroupées sur la même ligne, séparées par des virgules.
  const items = useMemo(() => {
    const lines: string[] = [];
    const localisation = answers["localisation"];
    if (localisation?.type === "params" && typeof localisation.params.label === "string") {
      lines.push(`On recherche les missions à ${localisation.params.label}`);
    }
    for (const stepId of RECAP_STEP_IDS) {
      const answer = answers[stepId];
      if (!answer || answer.type !== "options") continue;
      const labels = answer.option_ids.map((id) => OPTIONS[`${answer.taxonomy}.${id}` as TaxonomyValueKey]?.label).filter(Boolean) as string[];
      if (labels.length > 0) lines.push(labels.join(", "));
    }
    return lines;
  }, [answers]);

  // Révèle les points un par un.
  useEffect(() => {
    if (visibleCount >= items.length) return;
    const timeout = setTimeout(() => setVisibleCount((count) => count + 1), REVEAL_INTERVAL_MS);
    return () => clearTimeout(timeout);
  }, [visibleCount, items.length]);

  // Charge les résultats pendant l'animation. La promesse est conservée dans le
  // cache du service et réutilisée à l'arrivée sur /results/:id.
  useEffect(() => {
    const userScoringId = useQuizStore.getState().userScoringId;
    if (!userScoringId) {
      onComplete();
      return;
    }

    let active = true;
    fetchInitialMatches(userScoringId)
      .catch(() => {
        // Le cache est vidé en cas d'erreur : la page de résultats pourra réessayer.
      })
      .finally(() => {
        if (active) setMatchesLoaded(true);
      });

    return () => {
      active = false;
    };
  }, [onComplete]);

  // Marque la fin de l'animation, REVEAL_END_MS après l'apparition du dernier point.
  useEffect(() => {
    if (visibleCount < items.length) return;
    const timeout = setTimeout(() => setRevealEnded(true), REVEAL_END_MS);
    return () => clearTimeout(timeout);
  }, [visibleCount, items.length]);

  // Navigue quand les résultats sont chargés et que l'animation est terminée.
  useEffect(() => {
    if (matchesLoaded && revealEnded) onComplete();
  }, [matchesLoaded, revealEnded, onComplete]);

  return (
    <div className="flex flex-col gap-10">
      <h1 className="fr-h1 mb-0!">
        Parfait !
        <br />
        On cherche les meilleures missions
        <br />
        pour ta première expérience.
      </h1>
      <ul className="list-none! p-0! m-0! flex flex-col gap-3">
        {items.slice(0, visibleCount).map((label) => (
          <li key={label} className="flex items-center gap-3 fr-text--sm mb-0! animate-slide-up-fade">
            <span
              className="fr-icon-arrow-right-line fr-icon--sm flex items-center justify-center bg-action-high-blue-france text-inverted-blue-france h-5 w-5 rounded-full shrink-0"
              aria-hidden="true"
            />
            {label}
          </li>
        ))}
      </ul>
      <p className="fr-sr-only" role="status">
        Chargement de tes résultats…
      </p>
    </div>
  );
}
