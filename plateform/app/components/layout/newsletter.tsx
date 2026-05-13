import type { SubmitEvent } from "react";

import MailSendSvg from "@gouvfr/dsfr/dist/artwork/pictograms/digital/mail-send.svg?url";
import TraceSvg from "~/assets/svg/trace.svg";

interface NewsletterProps {
  title: string;
  subtitle: string;
  ctaText: string;
  hintText: string;
}

export default function Newsletter({
  title = "Inscris-toi à la newsletter",
  subtitle = "1 email par mois avec les missions qui pourraient t'intéresser.",
  ctaText = "Je m'inscris",
  hintText = "Tu peux te désinscrire à tout moment",
}: NewsletterProps) {
  const handleSubmit = (event: SubmitEvent) => {
    event.preventDefault();
  };

  return (
    <section className="bg-blue-france-950 relative">
      <img src={TraceSvg} alt="Trace" className="absolute top-20 left-0 w-1/5" />
      <div className="fr-container py-6! md:py-8! flex flex-col md:flex-row gap-4 md:gap-2 items-center justify-center">
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
          <form onSubmit={handleSubmit} className="max-w-md">
            <div className="fr-input-group fr-mb-2w">
              <label className="fr-label sr-only" htmlFor="newsletter-email">
                Adresse email
              </label>
              <input id="newsletter-email" type="email" required className="fr-input bg-background!" placeholder="nom@email.fr" />
            </div>
            <button type="submit" className="fr-btn w-full! md:w-auto! justify-center! md:justify-start!">
              {ctaText}
            </button>
            <p className="fr-hint-text fr-mt-1w">{hintText}</p>
          </form>
        </div>
      </div>
    </section>
  );
}
