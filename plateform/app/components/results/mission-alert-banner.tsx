import MailSendSvg from "@gouvfr/dsfr/dist/artwork/pictograms/digital/mail-send.svg?url";
import { type SubmitEvent, useId, useState } from "react";
import TraceSvg from "~/assets/svg/mission-alert-trace.svg";
import { subscribeNewsletter } from "~/services/newsletter";
import { useQuizStore } from "~/stores/quiz";
import { INVALID_EMAIL_FORMAT_ERROR, isValidEmail } from "~/utils/string";

interface MissionAlertBannerProps {
  userScoringId: string | undefined;
}

// Bandeau inséré dans la liste des résultats : inscrit l'utilisateur à la liste Brevo « Recommandations futures »
// (source `result_list`), qui lui enverra les nouvelles missions correspondant à ses réponses.
export default function MissionAlertBanner({ userScoringId }: MissionAlertBannerProps) {
  const distinctId = useQuizStore((s) => s.distinctId);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const emailId = useId();

  const handleSubmit = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedEmail = email.trim();
    if (!isValidEmail(trimmedEmail)) {
      setError(INVALID_EMAIL_FORMAT_ERROR);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await subscribeNewsletter({ email: trimmedEmail, distinctId, userScoringId, signupSource: "result_list" });
      setSuccess(true);
    } catch {
      setError("Une erreur est survenue. Merci de réessayer.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="relative my-6 flex flex-col gap-3 overflow-hidden bg-blue-france-975 p-6">
      <img src={TraceSvg} alt="" aria-hidden="true" className="pointer-events-none absolute top-1.5 right-16" />
      <img src={MailSendSvg} alt="" aria-hidden="true" className="pointer-events-none absolute -top-0.5 right-4 w-12 rotate-[-11deg]" />

      <h2 className="relative fr-text--lg font-bold! mb-0! pr-12">Reçois des missions qui matchent dès qu'elles sont dispo</h2>
      <p className="relative fr-text--sm mb-0!">On garde tes réponses, et on t'envoie des nouvelles missions qui te correspondent quand elles sont dispos.</p>

      {success ? (
        <p role="status" className="relative flex items-center gap-2 font-bold! text-blue-france-sun! mb-0!">
          <span className="fr-icon-check-line" aria-hidden="true" />
          C'est noté ! Tu recevras les nouvelles missions qui te correspondent.
        </p>
      ) : (
        <form onSubmit={handleSubmit} noValidate className="relative">
          <div className={`fr-input-group mb-0! ${error ? "fr-input-group--error" : ""}`}>
            <label className="fr-label fr-sr-only" htmlFor={emailId}>
              Ton adresse email
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
                aria-describedby={`${emailId}-hint ${error ? `${emailId}-error` : ""}`}
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
          <p id={`${emailId}-hint`} className="fr-hint-text mt-2! mb-0!">
            1 email 1 fois par mois. Uniquement des missions. Désinscription en un clic.
          </p>
        </form>
      )}
    </section>
  );
}
