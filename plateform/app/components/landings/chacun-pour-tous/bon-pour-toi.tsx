import { type SubmitEvent, useState } from "react";

import { subscribeNewsletter } from "~/services/newsletter";
import { useQuizStore } from "~/stores/quiz";

const BENEFICES = [
  { emoji: "🎓", label: "Une expérience à valoriser" },
  { emoji: "💼", label: "De nouvelles compétences" },
  { emoji: "🤝", label: "Des rencontres" },
  { emoji: "💸", label: "Une indemnité, selon la mission" },
  { emoji: "❤️", label: "Le sentiment d'être utile" },
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
      await subscribeNewsletter({ email, distinctId, signupSource: "chacun_pour_tous_newsletter" });
      setSuccess(true);
    } catch (err) {
      if (err instanceof Error && err.message === "INVALID_BODY") {
        setError("Le format de l'adresse e-mail n'est pas valide. Le format attendu est : nom@email.fr");
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
          <div>
            <h2 className="fr-h1 mb-4!">
              Bon pour vous,
              <br />
              utile pour tous
            </h2>
            <p className="fr-text--lead mb-0!">Une mission peut vous apporter&nbsp;:</p>
          </div>
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
            On vous prévient
          </h3>
          <p className="fr-text--lead mb-0!">Chaque mois, des missions liées à l'actualité et un éclairage sur les différentes façons de s'engager.</p>

          {success ? (
            <div role="status" className="fr-alert fr-alert--success fr-alert--sm">
              <p>Votre inscription est bien prise en compte. À très vite dans votre boîte mail !</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-6">
              <div className={`fr-input-group mb-0! ${error ? "fr-input-group--error" : ""}`}>
                <label className="fr-label fr-sr-only" htmlFor="landing-newsletter-email">
                  Votre adresse e-mail (ex. : nom@domaine.fr)
                </label>
                <input
                  id="landing-newsletter-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  aria-required="true"
                  aria-invalid={error ? true : undefined}
                  aria-describedby={`landing-newsletter-email-hint ${error ? "landing-newsletter-email-messages" : ""}`}
                  className="fr-input mt-0!"
                  placeholder="Votre adresse e-mail"
                />
                {error && (
                  <div className="fr-messages-group" id="landing-newsletter-email-messages" role="alert">
                    <p className="fr-message fr-message--error">{error}</p>
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-2">
                <button type="submit" disabled={loading} className="fr-btn w-full! justify-center!">
                  {loading ? "Inscription en cours…" : "Je m'inscris"}
                </button>
                <p id="landing-newsletter-email-hint" className="fr-hint-text mb-0!">
                  1 e-mail par mois. Vous pouvez vous désinscrire en un clic depuis chaque e-mail.
                </p>
              </div>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
