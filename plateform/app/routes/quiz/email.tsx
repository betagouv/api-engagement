import { type SubmitEvent, useEffect, useId, useState } from "react";
import { useLocation, useNavigate, useOutletContext } from "react-router";
import { PUBLISHER_ID } from "~/services/config";
import { sendMissionEmail } from "~/services/email";
import { fetchInitialMatches } from "~/services/matching";
import { trackEmailMissionsSent } from "~/services/tracking/events";
import type { QuizCompletionType } from "~/services/tracking/types";
import { useQuizStore } from "~/stores/quiz";
import type { QuizOutletContext } from "./_layout";

// Format attendu : nom@domaine.extension (pas de vérification de l'existence de la boîte).
const EMAIL_FORMAT = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const INVALID_FORMAT_ERROR = "Le format de l'adresse email n'est pas valide. Le format attendu est : nom@email.fr";

// Page affichée entre la dernière question (ou le raccourci « Voir toutes les missions ») et les résultats :
// l'email reçoit le top 6 des missions et inscrit l'utilisateur aux listes Brevo de la source `quiz`.
export default function EmailStep() {
  const navigate = useNavigate();
  const location = useLocation();
  const { showLoadingRecap } = useOutletContext<QuizOutletContext>();
  const distinctId = useQuizStore((s) => s.distinctId);
  const userScoringId = useQuizStore((s) => s.userScoringId);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const emailId = useId();

  // Sans scoring (accès direct à l'URL), il n'y a ni résultats à charger ni missions à envoyer.
  // Sinon on charge les résultats pendant la saisie : l'email lit le matching enregistré côté API, et la
  // promesse mise en cache est réutilisée par l'écran de chargement puis la page de résultats.
  useEffect(() => {
    if (!userScoringId) {
      navigate("/quiz", { replace: true });
      return;
    }
    fetchInitialMatches(userScoringId).catch(() => {
      // Le cache est vidé en cas d'erreur : l'envoi ou la page de résultats pourront réessayer.
    });
  }, [userScoringId]);

  // Parcours terminé : écran de chargement puis résultats. Raccourci : résultats directement, comme avant la page email.
  const goToResults = () => {
    const { completionType } = (location.state ?? {}) as { completionType?: QuizCompletionType };
    if (completionType === "full") {
      showLoadingRecap();
      return;
    }
    navigate(`/results/${userScoringId}`);
  };

  const handleSubmit = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!userScoringId) return;
    const trimmedEmail = email.trim();
    if (!EMAIL_FORMAT.test(trimmedEmail)) {
      console.warn("Email format invalid:", trimmedEmail);
      setError(INVALID_FORMAT_ERROR);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await fetchInitialMatches(userScoringId);
      const result = await sendMissionEmail({ email: trimmedEmail, publisherId: PUBLISHER_ID, userScoringId, distinctId, signupSource: "quiz" });
      if (result.email_sent) trackEmailMissionsSent({ hasAlertOptIn: false, entryPage: "quiz" });
      goToResults();
    } catch {
      // Le format est déjà vérifié ci-dessus : un INVALID_BODY de l'API ne vient pas de l'email saisi.
      setError("Une erreur est survenue. Merci de réessayer.");
    } finally {
      setLoading(false);
    }
  };

  if (!userScoringId) return null;

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-1 flex-col">
      <h1 className="fr-h1 mb-8!">Reçois tes prochaines missions basées sur tes réponses</h1>

      <div className={`fr-input-group md:max-w-sm ${error ? "fr-input-group--error" : ""}`}>
        <label className="fr-label" htmlFor={emailId}>
          Ton adresse email
          <span className="fr-hint-text">1 email 1 fois par mois avec d'autres missions</span>
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
        <button type="submit" disabled={!email.trim() || loading} className="fr-btn fr-btn--lg w-full! justify-center! md:w-auto!">
          {loading ? "Envoi en cours…" : "Voir mes résultats"}
        </button>
        <button type="button" onClick={goToResults} disabled={loading} className="fr-btn fr-btn--lg fr-btn--secondary w-full! justify-center! md:w-auto!">
          Continuer sans laisser mon email
        </button>
      </div>
    </form>
  );
}
