import ExitModal from "./exit-modal";

interface QuizProgressProps {
  step: number;
  stepCount: number;
}

// Sous le header global : barre de progression du quiz et bouton de sortie (desktop).
export default function QuizProgress({ step = 0, stepCount }: QuizProgressProps) {
  const progress = stepCount > 0 ? Math.min(100, Math.max(0, (step / stepCount) * 100)) : 0;

  return (
    <div className="relative">
      <div
        role="progressbar"
        aria-label="Progression du quiz"
        aria-valuemin={0}
        aria-valuemax={stepCount}
        aria-valuenow={step}
        aria-valuetext={`Étape ${step} sur ${stepCount}`}
        className="h-2 bg-beige-gris-galet"
      >
        <span className="sr-only">{`Étape ${step} sur ${stepCount}`}</span>
        <div className="h-full bg-blue-france-sun transition-[width] ease-out duration-500" style={{ width: `${progress}%` }} />
      </div>
      <ExitModal className="fr-icon-close-line text-blue-france-sun! absolute top-4 right-4 p-2 z-10 hidden lg:block" />
    </div>
  );
}
