import { type SubmitEvent, useState } from "react";

import { subscribeNewsletter } from "~/services/newsletter";
import { useQuizStore } from "~/stores/quiz";

// Emojis décoratifs : masqués aux technologies d'assistance, seul le libellé est lu.
const ATOUTS = [
  { emoji: "🎓", label: "De l'expérience pour ton CV" },
  { emoji: "📍", label: "Près de chez vous ou à distance" },
  { emoji: "💼", label: "Des compétences" },
  { emoji: "💸", label: "Avec ou sans indemnité" },
  { emoji: "❤️", label: "Adapté à vos valeurs" },
];

// Bloc « C'est quoi TrouveTaMission.gouv.fr ? » : présentation du service et inscription à la newsletter
// pour celles et ceux qui ne trouvent pas leur mission tout de suite.
export default function Presentation() {
  const distinctId = useQuizStore((s) => s.distinctId);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      <div className="bg-blue-ecume-850 flex flex-col gap-8 rounded-sm p-6 shadow-[0_6px_18px_0_rgba(0,0,18,0.16)] md:p-15">
        <div>
          <h2 className="fr-h1 text-title-grey! mb-3!">C'est quoi TrouveTaMission.gouv.fr ?</h2>
          <p className="fr-text--lead text-title-grey! mb-0!">
            Le service public qui aide chaque personne à trouver une façon concrète de s'engager, quelle que soit sa forme, de quelques heures à toute une vie !
          </p>
        </div>

        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <ul role="list" className="m-0! flex list-none! flex-wrap content-start gap-4 p-0! lg:max-w-154 lg:gap-6">
            {ATOUTS.map((atout) => (
              <li key={atout.label} className="bg-background flex items-center gap-4 p-0! px-4! py-3! drop-shadow-[0_6px_9px_rgba(0,0,18,0.16)]">
                <span aria-hidden="true" className="text-2xl">
                  {atout.emoji}
                </span>
                <span className="text-title-grey text-xl leading-7 font-bold">{atout.label}</span>
              </li>
            ))}
          </ul>

          <div className="bg-background flex flex-col gap-6 p-6 drop-shadow-[0_4px_6px_rgba(0,0,18,0.16)] md:p-10 lg:w-112 lg:shrink-0">
            <h3 className="fr-h2 text-title-grey! mb-0!">
              Pas le bon moment ?<br />
              On te prévient
            </h3>
            <p className="fr-text--lead text-title-grey! mb-0!">On t'envoie des idées de missions une fois par mois près de chez toi.</p>

            {success ? (
              <div role="status" className="fr-alert fr-alert--success fr-alert--sm">
                <p>Ton inscription est bien prise en compte. À très vite dans ta boîte mail !</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="flex flex-col gap-6">
                <div className={`fr-input-group mb-0! ${error ? "fr-input-group--error" : ""}`}>
                  <label className="fr-label fr-sr-only" htmlFor="presentation-newsletter-email">
                    Votre adresse électronique (ex. : nom@domaine.fr)
                  </label>
                  <input
                    id="presentation-newsletter-email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    aria-required="true"
                    aria-invalid={error ? true : undefined}
                    aria-describedby={error ? "presentation-newsletter-email-messages" : undefined}
                    className="fr-input mt-0! bg-background! shadow-[inset_0_-2px_0_0_var(--border-plain-blue-france)]!"
                    placeholder="Votre adresse électronique"
                  />
                  {error && (
                    <div className="fr-messages-group" id="presentation-newsletter-email-messages" role="alert">
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
      </div>
    </section>
  );
}
