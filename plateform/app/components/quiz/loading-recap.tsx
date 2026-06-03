import type { TaxonomyValueKey } from "@engagement/taxonomy";
import { useEffect, useMemo, useState } from "react";
import { OPTIONS } from "~/config/quiz-options";
import { prefetchInitialMatches } from "~/services/matching";
import { useQuizStore } from "~/stores/quiz";

type Props = {
  onComplete: () => void;
};

// Steps résumés à l'écran, dans l'ordre d'affichage.
const RECAP_STEP_IDS = ["statut", "duree", "motivation"] as const;

const REVEAL_INTERVAL_MS = 900;
const POST_REVEAL_PAUSE_MS = 800;
const EXIT_DURATION_MS = 700;

export default function LoadingRecap({ onComplete }: Props) {
  const answers = useQuizStore((s) => s.answers);

  // Une ligne par question ; les réponses multiples d'une même question
  // sont regroupées sur la même ligne, séparées par des virgules.
  const items = useMemo(
    () =>
      RECAP_STEP_IDS.flatMap((stepId) => {
        const answer = answers[stepId];
        if (!answer || answer.type !== "options") return [];
        const labels = answer.option_ids.map((id) => OPTIONS[`${answer.taxonomy}.${id}` as TaxonomyValueKey]?.label).filter(Boolean) as string[];
        return labels.length > 0 ? [labels.join(", ")] : [];
      }),
    [answers],
  );

  const [revealed, setRevealed] = useState(0);
  const [loadDone, setLoadDone] = useState(false);
  const [exiting, setExiting] = useState(false);

  // Démarre le chargement des résultats dès l'affichage, en parallèle de l'animation.
  // La promesse vit dans un cache module → réutilisée à l'arrivée sur /results/:id.
  useEffect(() => {
    const userScoringId = useQuizStore.getState().userScoringId;
    if (!userScoringId) {
      setLoadDone(true);
      return;
    }
    let active = true;
    prefetchInitialMatches(userScoringId)
      .catch(() => {
        // L'erreur sera ré-affichée à l'arrivée sur /results/:id (le cache a été vidé).
      })
      .finally(() => {
        if (active) setLoadDone(true);
      });
    return () => {
      active = false;
    };
  }, []);

  // Révèle les items un à un.
  useEffect(() => {
    if (revealed >= items.length) return;
    const timer = setTimeout(() => setRevealed((r) => r + 1), REVEAL_INTERVAL_MS);
    return () => clearTimeout(timer);
  }, [revealed, items.length]);

  // Sortie : seulement quand l'animation est terminée ET les résultats chargés.
  // → durée d'affichage = max(temps de chargement, temps d'animation).
  useEffect(() => {
    if (revealed < items.length || !loadDone) return;
    const exitTimer = setTimeout(() => setExiting(true), POST_REVEAL_PAUSE_MS);
    const completeTimer = setTimeout(onComplete, POST_REVEAL_PAUSE_MS + EXIT_DURATION_MS);
    return () => {
      clearTimeout(exitTimer);
      clearTimeout(completeTimer);
    };
  }, [revealed, items.length, loadDone, onComplete]);

  return (
    <div className={`flex flex-col gap-10 transition-all duration-700 ease-in ${exiting ? "opacity-0 translate-y-8" : "opacity-100 translate-y-0"}`}>
      <h1 className="fr-h1 mb-0!">
        Parfait.
        <br />
        On recherche des missions pour toi !
      </h1>
      <ul className="list-none! p-0! m-0! flex flex-col gap-3">
        {items.map((label, i) => (
          <li
            key={i}
            className={`flex items-center fr-text--lead gap-3 transition-all duration-700 ease-out ${i < revealed ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"}`}
          >
            <span
              className="fr-icon-arrow-right-line fr-icon--sm opacity-50 flex items-center justify-center bg-background-default-grey-active h-6 w-6 rounded-full"
              aria-hidden="true"
            />
            {label}
          </li>
        ))}
      </ul>
    </div>
  );
}
