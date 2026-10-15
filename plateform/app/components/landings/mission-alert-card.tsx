import MailSendSvg from "@gouvfr/dsfr/dist/artwork/pictograms/digital/mail-send.svg?url";
import { type SubmitEvent, useId, useState } from "react";

import TraceSvg from "~/assets/svg/mission-alert-trace.svg";
import { subscribeNewsletter } from "~/services/newsletter";
import { useQuizStore } from "~/stores/quiz";
import { INVALID_EMAIL_FORMAT_ERROR, isValidEmail } from "~/utils/string";

// Carte insérée parmi les premières missions d'une landing : inscrit le visiteur à la newsletter mensuelle de
// missions. Contenu calibré pour tenir dans la hauteur fixe d'une carte mission (h-83.75) : côte à côte, les deux
// cartes s'alignent. Pas de quiz sur ces parcours, donc pas de réponses à rattacher (contrairement au bandeau des résultats).
export default function MissionAlertCard() {
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
      await subscribeNewsletter({ email: trimmedEmail, distinctId });
      setSuccess(true);
    } catch {
      setError("Une erreur est survenue. Merci de réessayer.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="border-border-default-grey bg-blue-france-975 relative flex h-full flex-col gap-2 overflow-hidden border p-5">
      <img src={TraceSvg} alt="" aria-hidden="true" className="pointer-events-none absolute top-1.5 right-16" />
      <img src={MailSendSvg} alt="" aria-hidden="true" className="pointer-events-none absolute top-2 right-4 w-14 rotate-[-11deg]" />

      <h3 className="fr-text--lg text-title-grey relative mb-0! pr-16 font-bold">
        Reçois des missions
        <br />
        qui match des qu'elles sont dispo
      </h3>
      <p className="fr-text--sm relative mb-1!">On garde tes réponses, et on t'envoie des nouvelles missions qui te correspondent.</p>

      {success ? (
        <p role="status" className="text-blue-france-sun! relative mb-0! flex items-center gap-2 font-bold!">
          <span className="fr-icon-check-line" aria-hidden="true" />
          C'est noté ! Vous recevrez les nouvelles missions.
        </p>
      ) : (
        <form onSubmit={handleSubmit} noValidate className="relative flex flex-col gap-2">
          <div className={`fr-input-group mb-0! ${error ? "fr-input-group--error" : ""}`}>
            <label className="fr-label" htmlFor={emailId}>
              E-mail
            </label>
            <input
              id={emailId}
              name="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              aria-invalid={error ? true : undefined}
              aria-describedby={`${emailId}-hint ${error ? `${emailId}-error` : ""}`}
              className={`fr-input ${error ? "fr-input--error" : ""}`}
            />
            {error && (
              <div className="fr-messages-group" id={`${emailId}-error`} role="alert">
                <p className="fr-message fr-message--error">{error}</p>
              </div>
            )}
          </div>
          <button type="submit" disabled={loading} className="fr-btn fr-btn--secondary bg-background! w-full! justify-center!">
            {loading ? "Inscription en cours…" : "Recevoir mes missions"}
          </button>
          <p id={`${emailId}-hint`} className="fr-hint-text mb-0!">
            1 email 1 fois par mois. Uniquement des missions.
          </p>
        </form>
      )}
    </div>
  );
}
