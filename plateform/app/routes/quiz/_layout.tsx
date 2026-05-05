import type { TaxonomyValueKey } from "@engagement/taxonomy";
import { useEffect, useMemo, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router";
import BackButton from "~/components/quiz/back-button";
import QuizHeader from "~/components/quiz/header";
import LoadingRecap from "~/components/quiz/loading-recap";
import { QUIZ_FLOW, type StepDef } from "~/config/quiz-flow";
import { OPTIONS } from "~/config/quiz-options";
import { createUserScoring, updateUserScoring } from "~/services/user-scoring";
import { useQuizStore } from "~/stores/quiz";
import { evalCondition } from "~/utils/conditions";
import { buildPayload, refreshSteps } from "~/utils/quiz";
import type { Route } from "./+types/_layout";

// Contexte partagé avec les steps enfants via `useOutletContext<QuizOutletContext>()`.
export type QuizOutletContext = {
  goNext: () => void;
  goBack: () => void;
  transitioning: boolean;
  setTransitioning: (value: boolean) => void;
};

export function meta(): Route.MetaDescriptors {
  return [{ title: "Quiz Engagement" }, { name: "robots", content: "noindex, nofollow" }];
}

// Client-only : évite les mismatchs d'hydratation liés au store persisté en localStorage.
export async function clientLoader() {
  return {};
}

export function HydrateFallback() {
  return null;
}

export default function QuizLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { answers, setUserScoringId } = useQuizStore();
  const [steps, setSteps] = useState<StepDef[]>(QUIZ_FLOW.filter((s) => !s.condition || evalCondition(s.condition, answers)));
  const [transitioning, setTransitioning] = useState(false);
  const [loadingResults, setLoadingResults] = useState(false);
  const [scoringError, setScoringError] = useState<string | null>(null);
  const currentStep = useMemo(() => steps.find((s) => s.route === location.pathname) ?? null, [location.pathname, steps]);

  const currentIndex = currentStep ? steps.findIndex((s) => s.id === currentStep.id) : -1;

  // Guard : si la condition du step courant n'est pas remplie (ex: accès direct à /quiz/handicap
  // sans réponse à /quiz/age), on redirige vers le premier step visible.
  // Déclenché sur changement d'URL uniquement — pas à chaque réponse — pour éviter les boucles.
  useEffect(() => {
    if (!currentStep) return;
    if (currentStep.condition && !evalCondition(currentStep.condition, answers)) {
      const firstVisible = QUIZ_FLOW.find((s) => !s.condition || evalCondition(s.condition, answers));
      navigate(firstVisible?.route ?? "/quiz/age", { replace: true });
    }
  }, [location.pathname, currentStep]);

  const saveCurrentScoring = async (): Promise<boolean> => {
    const freshAnswers = useQuizStore.getState().answers;
    const freshGeo = useQuizStore.getState().geo;
    const freshUserScoringId = useQuizStore.getState().userScoringId;
    const freshDistinctId = useQuizStore.getState().distinctId;
    const payload = buildPayload(freshAnswers, freshGeo);

    if (payload.answers.length === 0) {
      return true;
    }

    try {
      if (!freshUserScoringId) {
        const id = await createUserScoring(payload, freshDistinctId);
        setUserScoringId(id);
        return true;
      }

      await updateUserScoring(freshUserScoringId, payload, freshDistinctId);
      return true;
    } catch (err) {
      console.error("[quiz] saveCurrentScoring failed", err);
      return false;
    }
  };

  const goNext = async () => {
    if (!currentStep) return;
    setTransitioning(false);
    setScoringError(null);
    const freshAnswers = useQuizStore.getState().answers;
    const scoringSaved = await saveCurrentScoring();

    if (!scoringSaved) {
      setScoringError("Impossible d'enregistrer tes réponses. Réessaie dans quelques instants.");
      return;
    }

    const { next, steps } = refreshSteps(QUIZ_FLOW, currentStep.id, freshAnswers);
    setSteps(steps);
    if (next) {
      navigate(next.route);
    } else {
      setLoadingResults(true);
    }
  };

  const handleLoadingComplete = () => {
    setLoadingResults(false);
    const id = useQuizStore.getState().userScoringId;
    navigate(id ? `/results/${id}` : "/");
  };

  const recapItems = (["statut", "duree", "motivation"] as const).flatMap((stepId) => {
    const answer = answers[stepId];
    if (!answer || answer.type !== "options") return [];
    return answer.option_ids.map((id) => OPTIONS[id as TaxonomyValueKey]?.label).filter(Boolean) as string[];
  });

  const goBack = () => {
    if (!currentStep) return;
    setTransitioning(false);
    const freshAnswers = useQuizStore.getState().answers;
    const { prev, steps } = refreshSteps(QUIZ_FLOW, currentStep.id, freshAnswers);
    setSteps(steps);
    navigate(prev ? prev.route : "/quiz/age", { replace: true });
  };

  return (
    <div className="flex flex-col flex-1">
      <QuizHeader step={loadingResults ? steps.length + 1 : currentIndex + 1} stepCount={steps.length + 1} transitioning={transitioning} />
      <main className="flex-1 bg-gradient-to-l from-blue-france-950/40 md:from-blue-france-950 to-transparent pt-10 pb-24 md:pb-10">
        <div className="fr-container flex flex-col gap-10">
          {!transitioning && !loadingResults && <BackButton href={currentIndex > 0 ? steps[currentIndex - 1].route : "/"} />}
          {scoringError && !loadingResults && (
            <div className="fr-alert fr-alert--error">
              <p>{scoringError}</p>
            </div>
          )}
          {loadingResults ? (
            <LoadingRecap items={recapItems} onComplete={handleLoadingComplete} />
          ) : (
            // `goNext` / `goBack` exposés aux routes enfants via Outlet context — elles les appellent après validation.
            <Outlet context={{ goNext, goBack, transitioning, setTransitioning } satisfies QuizOutletContext} />
          )}
        </div>
      </main>
    </div>
  );
}
