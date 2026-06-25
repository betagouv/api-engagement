import React from "react";
import { useNavigate, useOutletContext } from "react-router";
import { trackQuizCompleted, trackQuizShortcutTaken } from "~/services/tracking/events";
import { useQuizStore } from "~/stores/quiz";
import type { QuizOutletContext } from "~/routes/quiz/_layout";

interface NextButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  onClick?: () => void;
  skip?: boolean;
}

export default function NextButton({ onClick, skip = false, ...props }: NextButtonProps) {
  const navigate = useNavigate();
  const userScoringId = useQuizStore((s) => s.userScoringId);
  const { currentStepId, currentStepIndex } = useOutletContext<QuizOutletContext>();
  const handleSkip = () => {
    const { answers, quizStartedAt } = useQuizStore.getState();
    // Raccourci "Voir mes résultats" depuis une étape (feature_usage).
    if (currentStepId) {
      trackQuizShortcutTaken({ fromStepName: currentStepId, fromStepIndex: currentStepIndex, answers });
    }
    // Sans userScoringId, le quiz n'a produit aucun scoring : pas de complétion à tracker.
    if (!userScoringId) {
      navigate("/");
      return;
    }
    trackQuizCompleted({ answers, completionType: "shortcut", quizStartedAt });
    navigate(`/results/${userScoringId}`);
  };

  return (
    <>
      {skip && (
        <button type="button" onClick={handleSkip} className="fr-btn fr-btn--lg fr-btn--tertiary md:hidden! w-full! justify-center!">
          Voir les missions sans répondre à toutes les questions
        </button>
      )}
      <div className="fixed inset-x-0 bottom-0 z-10 bg-white p-4 md:static md:bg-transparent md:p-0 md:flex md:flex-row md:gap-6">
        <button type="button" onClick={onClick} className="fr-btn fr-btn--lg w-full! justify-center! md:w-auto!" {...props}>
          Continuer
        </button>
        {skip && (
          <button type="button" onClick={handleSkip} className="fr-btn fr-btn--lg fr-btn--tertiary hidden! md:inline-flex!">
            Voir les missions sans répondre à toutes les questions
          </button>
        )}
      </div>
    </>
  );
}
