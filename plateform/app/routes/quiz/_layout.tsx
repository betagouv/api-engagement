import { useEffect, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router";
import { QUIZ_FLOW, type StepDef } from "~/config/quiz-flow";
import { useQuizStore } from "~/stores/quiz";
import { evalCondition } from "~/utils/conditions";
import type { Route } from "./+types/_layout";

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
  const { answers, reset } = useQuizStore();

  // Liste des steps visibles dérivée des réponses courantes.
  // Mise à jour à chaque changement du store (ex: après une réponse à `age`, `handicap` peut apparaître/disparaître).
  const [steps, setSteps] = useState<StepDef[]>([]);

  useEffect(() => {
    const visibleSteps = QUIZ_FLOW.filter((s) => !s.condition || evalCondition(s.condition, answers));
    setSteps(visibleSteps);
  }, [answers]);

  const currentStep = QUIZ_FLOW.find((s) => s.route === location.pathname) ?? null;
  const currentIndex = currentStep ? steps.findIndex((s) => s.id === currentStep.id) : -1;
  console.log("steps", steps);
  console.log("current", currentIndex, currentStep);
  console.log("next", steps[currentIndex + 1]);

  // Guard : si la condition du step courant n'est pas remplie (ex: accès direct à /quiz/handicap
  // sans réponse à /quiz/age), on redirige vers le premier step visible.
  // Déclenché sur changement d'URL uniquement — pas à chaque réponse — pour éviter les boucles.
  useEffect(() => {
    if (!currentStep) return;
    if (currentStep.condition && !evalCondition(currentStep.condition, answers)) {
      const firstVisible = QUIZ_FLOW.find((s) => !s.condition || evalCondition(s.condition, answers));
      navigate(firstVisible?.route ?? "/quiz/age", { replace: true });
    }
  }, [location.pathname]);

  const goNext = () => {
    if (currentIndex < 0) return;
    const next = steps[currentIndex + 1];
    navigate(next ? next.route : "/quiz/results");
  };

  const goBack = () => {
    if (currentIndex <= 0) return;
    navigate(steps[currentIndex - 1].route);
  };

  const handleReset = () => {
    reset();
    navigate("/quiz/age", { replace: true });
  };

  const progress = currentIndex >= 0 ? (currentIndex + 1) / steps.length : 0;

  return (
    <main className="fr-container fr-py-6w">
      {currentStep && (
        <div className="fr-mb-4w">
          <div className="fr-stepper">
            <h2 className="fr-stepper__title">
              Étape {currentIndex + 1} sur {steps.length}
              <span className="fr-stepper__state">{Math.round(progress * 100)}% complété</span>
            </h2>
            <div className="fr-stepper__steps" data-fr-current-step={currentIndex + 1} data-fr-steps={steps.length} />
          </div>

          <div className="tw:flex tw:justify-between tw:items-center fr-mt-2w">
            <button
              type="button"
              className="fr-btn fr-btn--tertiary-no-outline fr-btn--icon-left fr-icon-arrow-left-line"
              onClick={goBack}
              disabled={currentIndex <= 0}
              aria-label="Retour à l'étape précédente"
            >
              Retour
            </button>
            <button type="button" className="fr-btn fr-btn--tertiary-no-outline" onClick={handleReset}>
              Recommencer
            </button>
          </div>
        </div>
      )}

      {/* `goNext` exposé aux routes enfants via Outlet context — elles l'appellent après validation. */}
      <Outlet context={goNext} />
    </main>
  );
}
