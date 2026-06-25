import { type SubmitEvent, useState } from "react";

import MailSendSvg from "@gouvfr/dsfr/dist/artwork/pictograms/digital/mail-send.svg?url";
import TraceSvg from "~/assets/svg/trace.svg";
import { subscribeNewsletter } from "~/services/newsletter";
import { useQuizStore } from "~/stores/quiz";

interface NewsletterProps {
  title: string;
  subtitle: string;
  ctaText: string;
  hintText: string;
}

export default function Newsletter({
  title = "Inscris-toi à la newsletter",
  subtitle = "1 email. Pas de spam.",
  ctaText = "Je m'inscris",
  hintText = "Tu te désinscris quand tu veux.",
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
    } catch {
      setError("Une erreur est survenue. Merci de réessayer.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="bg-blue-france-950 relative">
      <img src={TraceSvg} alt="Trace" className="absolute top-20 left-0 w-1/5" />
      <div className="fr-container py-6! md:py-12! px-6! flex flex-col md:flex-row gap-4 md:gap-2 items-center justify-center">
        <div className="flex-1 z-10" aria-hidden="true">
          {/* SVG illustration à venir */}
          <div className="flex items-center justify-center gap-4">
            <img src={MailSendSvg} alt="" className="hidden md:block rotate-12" />

            <div className="flex-1 max-w-md">
              <h2 className="fr-h2 fr-mb-2w">{title}</h2>
              <p className="fr-mb-0 text-title-grey fr-text--lead">{subtitle}</p>
            </div>
          </div>
        </div>

        <div className="flex-1 w-full md:w-auto">
          {success ? (
            <div className="fr-alert fr-alert--success max-w-md">
              <p>Ton inscription est bien prise en compte. À très vite dans ta boîte mail !</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="max-w-md">
              {error && (
                <div className="fr-alert fr-alert--error fr-mb-2w">
                  <p>{error}</p>
                </div>
              )}
              <div className="fr-input-group fr-mb-2w">
                <label className="fr-label sr-only" htmlFor="newsletter-email">
                  Adresse email
                </label>
                <input id="newsletter-email" name="email" type="email" required className="fr-input bg-background!" placeholder="nom@email.fr" />
              </div>
              <button type="submit" disabled={loading} className="fr-btn w-full! md:w-auto! justify-center! md:justify-start!">
                {loading ? "Inscription en cours…" : ctaText}
              </button>
              <p className="fr-hint-text fr-mt-1w">{hintText}</p>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
