import { type SubmitEvent, useEffect, useId, useRef, useState } from "react";
import { useLocation, useNavigate, useOutletContext } from "react-router";
import { PUBLISHER_ID } from "~/services/config";
import { sendMissionEmail } from "~/services/email";
import { fetchInitialMatches } from "~/services/matching";
import {
  trackEmailCaptureFailed,
  trackEmailCaptureSkipped,
  trackEmailCaptureSubmitted,
  trackEmailCaptureViewed,
  trackEmailMissionsSent,
  trackQuizCompleted,
  trackQuizStepCompleted,
} from "~/services/tracking/events";
import type { QuizCompletionType, QuizEmailOutcome } from "~/services/tracking/types";
import { useQuizStore } from "~/stores/quiz";
import { INVALID_EMAIL_FORMAT_ERROR, isValidEmail } from "~/utils/string";
import type { QuizOutletContext } from "./_layout";

// Page affichée entre la dernière question (ou le raccourci « Voir toutes les missions ») et les résultats :
// l'email reçoit le top 6 des missions et inscrit l'utilisateur aux listes Brevo de la source `quiz`.
export default function EmailStep() {
  const navigate = useNavigate();
  const location = useLocation();
  const { showLoadingRecap, currentStepIndex, totalSteps } = useOutletContext<QuizOutletContext>();
  const distinctId = useQuizStore((s) => s.distinctId);
  const userScoringId = useQuizStore((s) => s.userScoringId);
  const markEmailSent = useQuizStore((s) => s.markEmailSent);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const emailId = useId();
  const viewedTracked = useRef(false);
  // Perdu au rechargement de la page : on retombe sur « full ».
  const { completionType = "full" } = (location.state ?? {}) as { completionType?: QuizCompletionType };
  const captureContext = { signupSource: "quiz", completionType } as const;

  // Sans scoring (accès direct à l'URL), il n'y a ni résultats à charger ni missions à envoyer.
  // Sinon on charge les résultats pendant la saisie : l'email lit le matching enregistré côté API, et la
  // promesse mise en cache est réutilisée par l'écran de chargement puis la page de résultats.
  useEffect(() => {
    if (!userScoringId) {
      navigate("/quiz", { replace: true });
      return;
    }
    if (!viewedTracked.current) {
      viewedTracked.current = true;
      trackEmailCaptureViewed(captureContext);
    }
    fetchInitialMatches(userScoringId).catch(() => {
      // Le cache est vidé en cas d'erreur : l'envoi ou la page de résultats pourront réessayer.
    });
  }, [userScoringId]);

  // Parcours terminé : écran de chargement puis résultats. Raccourci : résultats directement, comme avant la page email.
  // Sortie de l'étape : `quiz.step_completed` (email) puis `quiz.completed` (une fois par tentative).
  const goToResults = (emailOutcome: QuizEmailOutcome) => {
    const { answers, quizStartedAt, quizAttemptId, completedAttemptId, markQuizCompleted } = useQuizStore.getState();
    // Rollback q3 : l'étape email n'appartient pas au flow (index 0), pas de `quiz.step_completed`.
    if (currentStepIndex > 0) trackQuizStepCompleted({ stepName: "email", answers, stepIndex: currentStepIndex, totalVisibleSteps: totalSteps });
    if (completedAttemptId !== quizAttemptId) {
      trackQuizCompleted({ answers, completionType, quizStartedAt, emailOutcome });
      markQuizCompleted();
    }
    if (completionType === "full") {
      showLoadingRecap();
      return;
    }
    navigate(`/results/${userScoringId}`);
  };

  const handleSkip = () => {
    trackEmailCaptureSkipped(captureContext, "continue_without_email");
    goToResults("skipped");
  };

  const handleSubmit = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!userScoringId) return;
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      trackEmailCaptureFailed({ signupSource: "quiz", errorType: "invalid_format" });
      setError("Renseigne ton adresse e-mail pour recevoir tes missions, ou continue sans laisser ton e-mail.");
      return;
    }
    if (!isValidEmail(trimmedEmail)) {
      console.warn("Email format invalid");
      trackEmailCaptureFailed({ signupSource: "quiz", errorType: "invalid_format" });
      setError(INVALID_EMAIL_FORMAT_ERROR);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await fetchInitialMatches(userScoringId);
      const result = await sendMissionEmail({ email: trimmedEmail, publisherId: PUBLISHER_ID, userScoringId, distinctId, signupSource: "quiz" });
      // `submitted` dès que l'API a accepté l'email (contact Brevo créé), même si aucun email n'est parti (`email_sent` false).
      trackEmailCaptureSubmitted(captureContext);
      if (result.email_sent) trackEmailMissionsSent({ hasAlertOptIn: false, entryPage: "quiz" });
      markEmailSent(userScoringId);
      goToResults("submitted");
    } catch {
      trackEmailCaptureFailed({ signupSource: "quiz", errorType: "api_error" });
      // Le format est déjà vérifié ci-dessus : un INVALID_BODY de l'API ne vient pas de l'email saisi.
      setError("Une erreur est survenue. Merci de réessayer.");
    } finally {
      setLoading(false);
    }
  };

  if (!userScoringId) return null;

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-1 flex-col">
      <h1 className="fr-h1 mb-8!">Reçois les nouvelles missions qui correspondent à tes réponses</h1>

      <div className={`fr-input-group md:max-w-sm ${error ? "fr-input-group--error" : ""}`}>
        <label className="fr-label" htmlFor={emailId}>
          Ton adresse e-mail
          <span className="fr-hint-text">1 e-mail 1 fois par mois avec d'autres missions</span>
        </label>
        <input
          id={emailId}
          name="email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${emailId}-error` : undefined}
          className={`fr-input ${error ? "fr-input--error" : ""}`}
        />
        {error && (
          <div className="fr-messages-group" id={`${emailId}-error`} role="alert">
            <p className="fr-message fr-message--error">{error}</p>
          </div>
        )}
      </div>

      <div className="sticky bottom-0 z-10 -mx-4 mt-auto flex flex-col gap-4 bg-background p-4 md:static md:mx-0 md:mt-4 md:flex-row md:gap-6 md:bg-transparent md:p-0">
        <button type="submit" disabled={loading} className="fr-btn fr-btn--lg w-full! justify-center! md:w-auto!">
          {loading ? "Envoi en cours…" : "Voir mes résultats"}
        </button>
        <button type="button" onClick={handleSkip} disabled={loading} className="fr-btn fr-btn--lg fr-btn--secondary w-full! justify-center! md:w-auto!">
          Continuer sans laisser mon e-mail
        </button>
      </div>
    </form>
  );
}
