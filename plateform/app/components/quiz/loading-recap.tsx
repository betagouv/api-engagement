import type { TaxonomyValueKey } from "@engagement/taxonomy";
import { useEffect, useMemo } from "react";
import { OPTIONS } from "~/config/quiz-options";
import { fetchInitialMatches } from "~/services/matching";
import { useQuizStore } from "~/stores/quiz";

type Props = {
  onComplete: () => void;
};

// Steps résumés à l'écran, dans l'ordre d'affichage.
const RECAP_STEP_IDS = ["statut", "duree", "motivation"] as const;

export default function LoadingRecap({ onComplete }: Props) {
  const answers = useQuizStore((state) => state.answers);

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

  // Charge les résultats avant la navigation. La promesse est conservée dans le
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
        if (active) onComplete();
      });

    return () => {
      active = false;
    };
  }, [onComplete]);

  return (
    <div className="flex flex-col gap-10">
      <h1 className="fr-h1 mb-0!">
        Parfait.
        <br />
        On recherche des missions pour toi !
      </h1>
      <ul className="list-none! p-0! m-0! flex flex-col gap-3">
        {items.map((label) => (
          <li key={label} className="flex items-center fr-text--lead gap-3">
            <span
              className="fr-icon-arrow-right-line fr-icon--sm opacity-50 flex items-center justify-center bg-background-default-grey-active h-6 w-6 rounded-full"
              aria-hidden="true"
            />
            {label}
          </li>
        ))}
      </ul>
      <p className="fr-text--sm mb-0!" role="status">
        Chargement de tes résultats…
      </p>
    </div>
  );
}
