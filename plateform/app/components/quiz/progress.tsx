interface QuizProgressProps {
  step: number;
  stepCount: number;
  nextLabel?: string;
}

// Indicateur d'étapes du quiz (modèle DSFR « indicateur d'étapes »). Le composant fr-stepper du DSFR
// est limité à 8 étapes : les segments sont donc construits ici, un par étape.
export default function QuizProgress({ step = 0, stepCount, nextLabel }: QuizProgressProps) {
  return (
    <div className="flex flex-col gap-3">
      <p className="fr-text--sm mb-0!">{`Étape ${step} sur ${stepCount}`}</p>
      <div
        role="progressbar"
        aria-label="Progression du quiz"
        aria-valuemin={0}
        aria-valuemax={stepCount}
        aria-valuenow={step}
        aria-valuetext={`Étape ${step} sur ${stepCount}`}
        className="flex gap-2"
      >
        {Array.from({ length: stepCount }, (_, index) => (
          <div key={index} className={`h-2 flex-1 transition-colors duration-500 ${index < step ? "bg-blue-france-sun" : "bg-[var(--background-contrast-grey)]"}`} />
        ))}
      </div>
      {nextLabel && (
        <p className="fr-text--xs text-mention-grey mb-0!">
          <span className="font-bold">Étape suivante :</span> {nextLabel}
        </p>
      )}
    </div>
  );
}
