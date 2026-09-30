import { type SubmitEvent, useState } from "react";

import { subscribeNewsletter } from "~/services/newsletter";
import { useQuizStore } from "~/stores/quiz";

// TODO: renseigner les URLs des comptes officiels
const SOCIAL_LINKS = [
  { name: "Facebook", className: "fr-btn--facebook", href: "https://www.facebook.com/TrouveTaMission" },
  { name: "TikTok", className: "fr-btn--tiktok", href: "https://www.tiktok.com/@trouvetamission" },
  { name: "LinkedIn", className: "fr-btn--linkedin", href: "https://www.linkedin.com/company/trouvetamission" },
  { name: "Instagram", className: "fr-btn--instagram", href: "https://www.instagram.com/trouvetamission_gouv" },
];

interface NewsletterProps {
  title: string;
  subtitle: string;
  ctaText: string;
  hintText: string;
}

export default function Newsletter({
  title = "Inscris-toi à la newsletter",
  subtitle = "1 e-mail par mois avec nos meilleures missions adaptées à tes critères",
  ctaText = "Je m'inscris",
  hintText = "1 e-mail. Pas de spam. Tu te désinscris quand tu veux.",
}: NewsletterProps) {
  const distinctId = useQuizStore((s) => s.distinctId);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const email = (form.elements.namedItem("email") as HTMLInputElement).value;

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
    <section className="fr-follow">
      <div className="fr-container">
        <div className="fr-grid-row">
          <div className="fr-col-12 fr-col-md-8">
            <div className="fr-follow__newsletter">
              <div>
                <h2 className="fr-h5">{title}</h2>
                <p className="fr-text--sm">{subtitle}</p>
              </div>
              <div className="w-full">
                {success ? (
                  <div role="status" className="fr-alert fr-alert--success fr-alert--sm">
                    <p>Ton inscription est bien prise en compte. À très vite dans ta boîte mail !</p>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit}>
                    <div className={`fr-input-group ${error ? "fr-input-group--error" : ""}`}>
                      <label className="fr-label" htmlFor="newsletter-email">
                        Votre adresse électronique (ex. : nom@domaine.fr)
                      </label>
                      <div className="fr-input-wrap fr-input-wrap--addon">
                        <input
                          id="newsletter-email"
                          name="email"
                          type="email"
                          autoComplete="email"
                          required
                          aria-required="true"
                          aria-invalid={error ? true : undefined}
                          aria-describedby={`newsletter-email-hint ${error ? "newsletter-email-messages" : ""}`}
                          className="fr-input"
                          placeholder="Votre adresse électronique (ex. : nom@domaine.fr)"
                        />
                        <button type="submit" disabled={loading} className="fr-btn shrink-0! whitespace-nowrap!">
                          {loading ? "Inscription en cours…" : ctaText}
                        </button>
                      </div>
                      {error && (
                        <div className="fr-messages-group" id="newsletter-email-messages" role="alert">
                          <p className="fr-message fr-message--error">{error}</p>
                        </div>
                      )}
                    </div>
                    <p id="newsletter-email-hint" className="fr-hint-text">
                      {hintText}
                    </p>
                  </form>
                )}
              </div>
            </div>
          </div>
          <div className="fr-col-12 fr-col-md-4">
            <div className="fr-follow__social">
              <h2 className="fr-h5">
                Suivez-nous
                <br /> sur les réseaux sociaux
              </h2>
              <ul className="fr-btns-group">
                {SOCIAL_LINKS.map(({ name, className, href }) => (
                  <li key={name}>
                    <a className={`fr-btn ${className}`} href={href} title={`${name} - nouvelle fenêtre`} target="_blank" rel="noopener noreferrer">
                      {name}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
