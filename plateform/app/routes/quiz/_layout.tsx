import { useEffect, useMemo, useRef, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router";
import BackButton from "~/components/quiz/back-button";
import QuizHeader from "~/components/quiz/header";
import LoadingRecap from "~/components/quiz/loading-recap";
import { QUIZ_FLOW, type StepDef } from "~/config/quiz-flow";
import { invalidateInitialMatches } from "~/services/matching";
import { createUserScoring, updateUserScoring } from "~/services/user-scoring";
import { trackQuizCompleted } from "~/services/tracking/events";
import { useQuizStore } from "~/stores/quiz";
import { evalCondition } from "~/utils/conditions";
import { buildPayload, refreshSteps } from "~/utils/quiz";
import type { Route } from "./+types/_layout";

// Contexte partagé avec les steps enfants via `useOutletContext<QuizOutletContext>()`.
export type QuizOutletContext = {
  goNext: () => void;
  goBack: () => void;
  saveScoring: () => void;
  transitioning: boolean;
  setTransitioning: (value: boolean) => void;
};

export function meta(): Route.MetaDescriptors {
  return [{ title: "Quiz Engagement" }, { name: "robots", content: "noindex, nofollow" }];
}

// Client-only : évite les mismatchs d'hydratation liés au store persisté en localStorage.
export async function clientLoader() {
  return { header: "hidden" };
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
  // Promise en cours de save — partagée entre saveScoring() et goNext() pour éviter un double appel.
  const scoringPromiseRef = useRef<Promise<boolean> | null>(null);

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

  const doSaveScoring = async (): Promise<boolean> => {
    const freshAnswers = useQuizStore.getState().answers;
    const freshUserScoringId = useQuizStore.getState().userScoringId;
    const freshDistinctId = useQuizStore.getState().distinctId;
    const payload = buildPayload(freshAnswers);

    if (payload.answers.length === 0) {
      return true;
    }

    try {
      if (!freshUserScoringId) {
        const id = await createUserScoring({ ...payload, distinctId: freshDistinctId });
        setUserScoringId(id);
        return true;
      }

      await updateUserScoring(freshUserScoringId, { ...payload, distinctId: freshDistinctId });
      invalidateInitialMatches(freshUserScoringId);
      return true;
    } catch (err) {
      console.error("[quiz] saveCurrentScoring failed", err);
      return false;
    }
  };

  // Lance le save si pas déjà en cours, ou joint la promise existante.
  // Appelé par les steps dès que la réponse est validée (avant ou pendant la transition).
  const saveScoring = () => {
    if (!scoringPromiseRef.current) {
      scoringPromiseRef.current = doSaveScoring().then((ok) => {
        if (!ok) scoringPromiseRef.current = null;
        return ok;
      });
    }
    return scoringPromiseRef.current;
  };

  // Réinitialise `transitioning` uniquement après que la navigation a commité (nouveau pathname effectif).
  // Si on appelait setTransitioning(false) dans goNext() après navigate(), React Router v7 différerait
  // la navigation via startTransition, et le setState synchrone commiterait en premier — ce qui
  // provoquerait un flash du step précédent (transitioning=false sur l'ancienne route).
  useEffect(() => {
    setTransitioning(false);
    scoringPromiseRef.current = null;
  }, [location.pathname]);

  const goNext = async () => {
    if (!currentStep) return;
    setScoringError(null);
    const freshAnswers = useQuizStore.getState().answers;
    const scoringSaved = await saveScoring();

    if (!scoringSaved) {
      setScoringError("Impossible d'enregistrer tes réponses. Réessaie dans quelques instants.");
      setTransitioning(false);
      return;
    }

    const { next, steps } = refreshSteps(QUIZ_FLOW, currentStep.id, freshAnswers);
    setSteps(steps);
    if (next) {
      navigate(next.route);
    } else {
      trackQuizCompleted({ answers: freshAnswers, completionType: "full", quizStartedAt: useQuizStore.getState().quizStartedAt });
      setLoadingResults(true);
    }
  };

  const handleLoadingComplete = () => {
    setLoadingResults(false);
    const id = useQuizStore.getState().userScoringId;
    navigate(id ? `/results/${id}` : "/");
  };

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
      <QuizHeader
        step={loadingResults ? steps.length + 1 : currentIndex + 1}
        stepCount={steps.length + 1}
        backHref={!transitioning && !loadingResults ? (currentIndex > 0 ? steps[currentIndex - 1].route : "/") : undefined}
      />
      <main className="flex-1 bg-gradient-to-l from-blue-france-950/40 md:from-blue-france-950 to-transparent pt-10 pb-24 md:pb-10">
        <div className="fr-container flex flex-col gap-10">
          {!transitioning && !loadingResults && (
            <div className="hidden lg:block">
              <BackButton href={currentIndex > 0 ? steps[currentIndex - 1].route : "/"} />
            </div>
          )}
          {scoringError && !loadingResults && (
            <div className="fr-alert fr-alert--error">
              <p>{scoringError}</p>
            </div>
          )}
          {loadingResults ? (
            <LoadingRecap onComplete={handleLoadingComplete} />
          ) : (
            // `goNext` / `goBack` / `saveScoring` exposés aux routes enfants via Outlet context.
            <Outlet context={{ goNext, goBack, saveScoring, transitioning, setTransitioning } satisfies QuizOutletContext} />
          )}
        </div>
      </main>
    </div>
  );
}
