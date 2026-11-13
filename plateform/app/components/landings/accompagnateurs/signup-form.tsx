import { type SubmitEvent, useState } from "react";

import { subscribeNewsletter } from "~/services/newsletter";
import { useQuizStore } from "~/stores/quiz";

export const SIGNUP_EMAIL_ID = "accompagnateurs-email";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MESSAGE_EMPTY = "Renseignez votre adresse e-mail pour recevoir un accès en avant-première à votre compte pro";
const MESSAGE_INVALID = "Le format de l'adresse e-mail n'est pas valide. Le format attendu est : nom@societe.fr";

// Inscription à la liste Brevo « Produit - Accompagnateurs » (via la source d'inscription dédiée).
// `noValidate` : on affiche nos messages DSFR plutôt que les bulles natives du navigateur.
export default function SignupForm() {
  const distinctId = useQuizStore((s) => s.distinctId);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    const email = (event.currentTarget.elements.namedItem("email") as HTMLInputElement).value.trim();

    if (!email) return setError(MESSAGE_EMPTY);
    if (!EMAIL_PATTERN.test(email)) return setError(MESSAGE_INVALID);

    setLoading(true);
    setError(null);
    try {
      await subscribeNewsletter({ email, distinctId, signupSource: "landing_accompagnateurs" });
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error && err.message === "INVALID_BODY" ? MESSAGE_INVALID : "Une erreur est survenue. Merci de réessayer.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-background shadow-tile p-6! md:p-8!">
      {success ? (
        <div role="status" className="fr-alert fr-alert--success fr-alert--sm">
          <p>C’est enregistré ! Vous recevrez bientôt un accès à votre espace pro.</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} noValidate>
          <div className={`fr-input-group mb-0! ${error ? "fr-input-group--error" : ""}`}>
            <label className="fr-label" htmlFor={SIGNUP_EMAIL_ID}>
              Votre adresse e-mail professionnelle
              <span className="fr-hint-text">Format attendu : nom@societe.fr</span>
            </label>
            <div className="fr-input-wrap fr-input-wrap--addon">
              <input
                id={SIGNUP_EMAIL_ID}
                name="email"
                type="email"
                autoComplete="email"
                aria-required="true"
                aria-invalid={error ? true : undefined}
                aria-describedby={error ? `${SIGNUP_EMAIL_ID}-error` : undefined}
                className="fr-input"
                placeholder="nom@structure.fr"
              />
              <button type="submit" disabled={loading} className="fr-btn shrink-0! whitespace-nowrap!">
                {loading ? "Inscription en cours…" : "Tester en avant-première"}
              </button>
            </div>
            {error && (
              <div className="fr-messages-group" id={`${SIGNUP_EMAIL_ID}-error`} role="alert">
                <p className="fr-message fr-message--error">{error}</p>
              </div>
            )}
          </div>
          <p className="fr-hint-text mt-4! mb-0!">Un service public numérique de l’État. Désinscription en un clic.</p>
        </form>
      )}
    </div>
  );
}
