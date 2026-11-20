import React from "react";
import { Link, useOutletContext } from "react-router";
import BackButton from "~/components/quiz/back-button";
import { getStepDef } from "~/config/quiz-flow";
import { useIsMobile } from "~/hooks/useIsMobile";
import type { QuizOutletContext } from "~/routes/quiz/_layout";
import { trackQuizShortcutTaken } from "~/services/tracking/events";
import { useQuizStore } from "~/stores/quiz";

interface NextButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  onClick?: () => void;
  skip?: boolean;
}

export default function NextButton({ onClick, skip = false, ...props }: NextButtonProps) {
  const isMobile = useIsMobile();
  const userScoringId = useQuizStore((s) => s.userScoringId);
  const { currentStepId, currentStepIndex, backHref, onBackNavigated } = useOutletContext<QuizOutletContext>();
  // Raccourci "Voir mes résultats" depuis une étape (feature_usage).
  const handleSkip = () => {
    const { answers } = useQuizStore.getState();
    if (currentStepId) {
      trackQuizShortcutTaken({ fromStepName: currentStepId, fromStepIndex: currentStepIndex, answers });
    }
  };

  const isLastQuestion = currentStepId ? Boolean(getStepDef(currentStepId).completes) : false;

  // Sans userScoringId, le quiz n'a produit aucun scoring : retour à l'accueil, pas de complétion à tracker.
  // `quiz.completed` part à la sortie de l'étape email.
  const skipLink = (
    <Link
      to={userScoringId ? "/quiz/email" : "/"}
      state={userScoringId ? { completionType: "shortcut" } : undefined}
      onClick={handleSkip}
      className="fr-link fr-icon-arrow-right-line fr-link--icon-right self-center md:self-start"
    >
      Voir toutes les missions
    </Link>
  );

  return (
    <>
      {skip && isMobile && skipLink}
      <div className="sticky bottom-0 z-10 -mx-4 mt-auto bg-background p-4 md:static md:mx-0 md:mt-0 md:bg-transparent md:p-0 md:flex md:flex-row md:gap-6">
        {/* Mobile : seul « Continuer » reste, collé en bas d'écran (maquette). */}
        <BackButton href={backHref} onBack={onBackNavigated} className="hidden! md:inline-flex!" />
        <button type="button" onClick={onClick} className="fr-btn fr-btn--lg w-full! justify-center! md:w-auto!" {...props}>
          {isLastQuestion ? "Voir mes missions" : "Continuer"}
        </button>
      </div>
      {skip && !isMobile && skipLink}
    </>
  );
}
