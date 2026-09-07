import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router";
import BackButton from "~/components/quiz/back-button";
import QuizHeader from "~/components/quiz/header";
import LoadingRecap from "~/components/quiz/loading-recap";
import { QUIZ_FLOW, QUIZ_FLOW_REGISTRY, type StepDef, type StepId } from "~/config/quiz-flow";
import { invalidateInitialMatches } from "~/services/matching";
import { captureException } from "~/services/sentry";
import { trackQuizBackNavigated, trackQuizCompleted, trackQuizStepCompleted } from "~/services/tracking/events";
import { createUserScoring, updateUserScoring } from "~/services/user-scoring";
import { useQuizStore } from "~/stores/quiz";
import { evalCondition } from "~/utils/conditions";
import { buildPayload, refreshSteps } from "~/utils/quiz";
import type { Route } from "./+types/_layout";

// Contexte partagé avec les steps enfants via `useOutletContext<QuizOutletContext>()`.
export type QuizOutletContext = {
  goNext: () => void;
  goBack: () => void;
  saveScoring: () => void;
  // Step courant (pour le tracking des raccourcis depuis NextButton).
  currentStepId: StepId | null;
  currentStepIndex: number;
};

// Titre par step (RGAA 8.6) : les routes enfants n'exportent pas de meta(), celui-ci s'applique à toutes.
// Le flow actif est cherché en premier, puis les autres versions (leurs routes restent accessibles).
export function meta({ location }: Route.MetaArgs): Route.MetaDescriptors {
  const step =
    QUIZ_FLOW.find((s) => s.route === location.pathname) ??
    Object.values(QUIZ_FLOW_REGISTRY)
      .flat()
      .find((s) => s.route === location.pathname);
  const title = step ? `${step.title} — Quiz Engagement — Trouve ta mission` : "Quiz Engagement — Trouve ta mission";
  return [{ title }, { name: "robots", content: "noindex, nofollow" }];
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
  const [loadingResultsPath, setLoadingResultsPath] = useState<string | null>(null);
  const [scoringError, setScoringError] = useState<string | null>(null);
  const currentStep = useMemo(() => steps.find((s) => s.route === location.pathname) ?? null, [location.pathname, steps]);
  const loadingResults = loadingResultsPath === location.pathname;
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
      navigate(firstVisible?.route ?? QUIZ_FLOW[0].route, { replace: true });
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
      captureException(err, {
        action: "saveScoring",
        currentStepId: currentStep?.id,
        hasUserScoringId: Boolean(freshUserScoringId),
      });
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

  // Réinitialise le save et interrompt l'écran de préchargement à chaque changement de route.
  // Le pathname mémorisé garantit que l'Outlet précédent est rendu dès un retour navigateur,
  // avant même l'exécution de cet effet et le nettoyage de la promesse par LoadingRecap.
  useEffect(() => {
    scoringPromiseRef.current = null;
    setLoadingResultsPath(null);
  }, [location.pathname]);

  const goNext = async () => {
    if (!currentStep) return;
    setScoringError(null);
    const freshAnswers = useQuizStore.getState().answers;
    const scoringSaved = await saveScoring();

    if (!scoringSaved) {
      setScoringError("Impossible d'enregistrer tes réponses. Réessaie dans quelques instants.");
      return;
    }

    // `steps` et `currentIndex` reflètent la séquence visible telle que vue par l'utilisateur.
    trackQuizStepCompleted({ stepName: currentStep.id, answers: freshAnswers, stepIndex: currentIndex + 1, totalVisibleSteps: steps.length });

    const { next, steps: nextSteps } = refreshSteps(QUIZ_FLOW, currentStep.id, freshAnswers);
    setSteps(nextSteps);
    if (next) {
      navigate(next.route);
    } else {
      trackQuizCompleted({ answers: freshAnswers, completionType: "full", quizStartedAt: useQuizStore.getState().quizStartedAt });
      setLoadingResultsPath(location.pathname);
    }
  };

  const handleLoadingComplete = useCallback(() => {
    const id = useQuizStore.getState().userScoringId;
    navigate(id ? `/results/${id}` : "/");
  }, [navigate]);

  const goBack = () => {
    if (!currentStep) return;
    const freshAnswers = useQuizStore.getState().answers;
    const { prev, steps } = refreshSteps(QUIZ_FLOW, currentStep.id, freshAnswers);
    setSteps(steps);
    navigate(prev ? prev.route : QUIZ_FLOW[0].route, { replace: true });
  };

  // quiz.back_navigated : clic sur un bouton "Retour" (header mobile ou BackButton desktop).
  const handleBackNavigated = () => {
    if (currentStep) trackQuizBackNavigated({ fromStepName: currentStep.id, fromStepIndex: currentIndex + 1 });
  };

  return (
    <div className="flex flex-col flex-1">
      <QuizHeader
        step={loadingResults ? steps.length + 1 : currentIndex + 1}
        stepCount={steps.length + 1}
        backHref={!loadingResults ? (currentIndex > 0 ? steps[currentIndex - 1].route : "/") : undefined}
        onBack={handleBackNavigated}
      />
      <main id="contenu" tabIndex={-1} className="flex-1 bg-gradient-to-l from-blue-france-950/40 md:from-blue-france-950 to-transparent pt-10 pb-24 md:pb-10">
        <div className="fr-container flex flex-col gap-10">
          {!loadingResults && (
            <div className="hidden lg:block">
              <BackButton href={currentIndex > 0 ? steps[currentIndex - 1].route : "/"} onBack={handleBackNavigated} />
            </div>
          )}
          {scoringError && !loadingResults && (
            <div className="fr-alert fr-alert--error" role="alert">
              <p>{scoringError}</p>
            </div>
          )}
          {loadingResults ? (
            <LoadingRecap onComplete={handleLoadingComplete} />
          ) : (
            // `goNext` / `goBack` / `saveScoring` exposés aux routes enfants via Outlet context.
            <Outlet
              context={
                {
                  goNext,
                  goBack,
                  saveScoring,
                  currentStepId: currentStep?.id ?? null,
                  currentStepIndex: currentIndex + 1,
                } satisfies QuizOutletContext
              }
            />
          )}
        </div>
      </main>
    </div>
  );
}
