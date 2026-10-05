import { type SubmitEvent, useState } from "react";

import { subscribeNewsletter } from "~/services/newsletter";
import { useQuizStore } from "~/stores/quiz";

const BENEFICES = [
  { emoji: "🎓", label: "De l'expérience pour ton CV" },
  { emoji: "💼", label: "Des compétences" },
  { emoji: "🤝", label: "Des rencontres" },
  { emoji: "💸", label: "Avec ou sans indemnité" },
  { emoji: "❤️", label: "La fierté d'être utile" },
];

export default function BonPourToi() {
  const distinctId = useQuizStore((s) => s.distinctId);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Même inscription que le bloc newsletter du site (`components/layout/newsletter.tsx`), dans une mise en page compacte.
  const handleSubmit = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    const email = (event.currentTarget.elements.namedItem("email") as HTMLInputElement).value;

    setLoading(true);
    setError(null);

    try {
      await subscribeNewsletter({ email, distinctId });
      setSuccess(true);
    } catch (err) {
      if (err instanceof Error && err.message === "INVALID_BODY") {
        setError("Le format de l'adresse email n'est pas valide. Le format attendu est : nom@email.fr");
      } else {
        setError("Une erreur est survenue. Merci de réessayer.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="fr-container">
      <div className="bg-blue-ecume-850 flex flex-col gap-8 rounded-sm p-4 shadow-[0_6px_18px_0_rgba(0,0,18,0.16)] md:p-8 lg:flex-row lg:items-start lg:gap-6 lg:p-15">
        <div className="flex flex-1 flex-col gap-6 md:gap-10">
          <h2 className="fr-h1 mb-0!">
            Bon pour toi,
            <br />
            utile pour tous
          </h2>
          <ul role="list" className="m-0! flex list-none! flex-col items-start gap-2 p-0! drop-shadow-[0_6px_9px_rgba(0,0,18,0.16)] md:flex-row md:flex-wrap md:gap-6">
            {BENEFICES.map((benefice) => (
              <li key={benefice.label} className="bg-background flex items-center gap-2 p-2 md:gap-4 md:px-4! md:py-3!">
                <span aria-hidden="true" className="text-2xl">
                  {benefice.emoji}
                </span>
                <span className="text-title-grey text-lg font-bold md:text-xl">{benefice.label}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-background flex flex-col gap-6 p-4 shadow-[0_4px_12px_0_rgba(0,0,18,0.16)] md:p-10 lg:w-md">
          <h3 className="fr-h2 mb-0!">
            Pas le bon moment ?
            <br />
            On te prévient
          </h3>
          <p className="fr-text--lead mb-0!">On t'envoie des idées de missions une fois par mois près de chez toi.</p>

          {success ? (
            <div role="status" className="fr-alert fr-alert--success fr-alert--sm">
              <p>Ton inscription est bien prise en compte. À très vite dans ta boîte mail !</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-6">
              <div className={`fr-input-group mb-0! ${error ? "fr-input-group--error" : ""}`}>
                <label className="fr-label fr-sr-only" htmlFor="landing-newsletter-email">
                  Votre adresse électronique (ex. : nom@domaine.fr)
                </label>
                <input
                  id="landing-newsletter-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  aria-required="true"
                  aria-invalid={error ? true : undefined}
                  aria-describedby={error ? "landing-newsletter-email-messages" : undefined}
                  className="fr-input mt-0!"
                  placeholder="Votre adresse électronique"
                />
                {error && (
                  <div className="fr-messages-group" id="landing-newsletter-email-messages" role="alert">
                    <p className="fr-message fr-message--error">{error}</p>
                  </div>
                )}
              </div>
              <button type="submit" disabled={loading} className="fr-btn w-full! justify-center!">
                {loading ? "Inscription en cours…" : "Je m'inscris"}
              </button>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
