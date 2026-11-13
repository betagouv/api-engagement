import MailSendSvg from "@gouvfr/dsfr/dist/artwork/pictograms/digital/mail-send.svg?url";
import { type SubmitEvent, useEffect, useId, useState } from "react";
import TraceSvg from "~/assets/svg/mission-alert-trace.svg";
import { subscribeNewsletter } from "~/services/newsletter";
import { trackEmailCaptureFailed, trackEmailCaptureSubmitted, trackEmailCaptureViewed } from "~/services/tracking/events";
import { useQuizStore } from "~/stores/quiz";
import { INVALID_EMAIL_FORMAT_ERROR, isValidEmail } from "~/utils/string";

interface MissionAlertBannerProps {
  userScoringId: string | undefined;
}

// Bandeau inséré dans la liste des résultats : inscrit l'utilisateur aux listes Brevo « Newsletter » et
// « Recommandations futures » (source `result_list`), en gardant ses réponses pour les prochaines missions.
export default function MissionAlertBanner({ userScoringId }: MissionAlertBannerProps) {
  const distinctId = useQuizStore((s) => s.distinctId);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const emailId = useId();

  // `email_capture.viewed` : encart affiché, une fois par scoring (ré-armé après un re-scoring, comme `results.viewed`).
  useEffect(() => {
    trackEmailCaptureViewed({ signupSource: "result_list" });
  }, [userScoringId]);

  const handleSubmit = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedEmail = email.trim();
    if (!isValidEmail(trimmedEmail)) {
      trackEmailCaptureFailed({ signupSource: "result_list", errorType: "invalid_format" });
      setError(INVALID_EMAIL_FORMAT_ERROR);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await subscribeNewsletter({ email: trimmedEmail, distinctId, userScoringId, signupSource: "result_list" });
      trackEmailCaptureSubmitted({ signupSource: "result_list" });
      setSuccess(true);
    } catch {
      trackEmailCaptureFailed({ signupSource: "result_list", errorType: "api_error" });
      setError("Une erreur est survenue. Merci de réessayer.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="relative my-6 flex flex-col gap-3 overflow-hidden bg-blue-france-975 p-6">
      <img src={TraceSvg} alt="" aria-hidden="true" className="pointer-events-none absolute top-1.5 right-16" />
      <img src={MailSendSvg} alt="" aria-hidden="true" className="pointer-events-none absolute -top-0.5 right-4 w-12 rotate-[-11deg]" />

      <h2 className="relative fr-text--lg font-bold! mb-0! pr-12">Reçois les nouvelles missions qui matchent tes réponses</h2>
      <p className="relative fr-text--sm mb-0!">
        On garde tes réponses et on t'envoie 1 e-mail par mois avec de nouvelles missions et des actualités sur l'engagement. Tu peux te désinscrire en un clic depuis chaque
        e-mail.
      </p>

      {success ? (
        <p role="status" className="relative flex items-center gap-2 font-bold! text-blue-france-sun! mb-0!">
          <span className="fr-icon-check-line" aria-hidden="true" />
          C'est noté ! Tu recevras chaque mois de nouvelles missions et des actualités sur l'engagement.
        </p>
      ) : (
        <form onSubmit={handleSubmit} noValidate className="relative">
          <div className={`fr-input-group mb-0! ${error ? "fr-input-group--error" : ""}`}>
            <label className="fr-label fr-sr-only" htmlFor={emailId}>
              Ton adresse e-mail
            </label>
            <div className="fr-input-wrap fr-input-wrap--addon">
              <input
                id={emailId}
                name="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                aria-invalid={error ? true : undefined}
                aria-describedby={error ? `${emailId}-error` : undefined}
                className={`fr-input bg-background! ${error ? "fr-input--error" : ""}`}
                placeholder="nom@domaine.fr"
              />
              <button type="submit" disabled={loading} className="fr-btn shrink-0! whitespace-nowrap!">
                {loading ? "Inscription en cours…" : "Recevoir des missions"}
              </button>
            </div>
            {error && (
              <div className="fr-messages-group" id={`${emailId}-error`} role="alert">
                <p className="fr-message fr-message--error">{error}</p>
              </div>
            )}
          </div>
        </form>
      )}
    </section>
  );
}
