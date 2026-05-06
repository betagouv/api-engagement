import type { SubmitEvent } from "react";

// TODO check to use the svg from the dsfr (not working)
// import MailSendSvg from "@gouvfr/dsfr/dist/artwork/pictograms/mail-send.svg";
import MailSendSvg from "~/assets/svg/mail-send.svg";
import TraceSvg from "~/assets/svg/trace.svg";

export default function Newsletter() {
  const handleSubmit = (event: SubmitEvent) => {
    event.preventDefault();
  };

  return (
    <section className="bg-blue-france-950 relative">
      <img src={TraceSvg} alt="Trace" className="absolute top-20 left-0 w-1/5" />
      <div className="fr-py-8w flex items-center justify-center">
        <div className="flex-1 hidden md:block z-10" aria-hidden="true">
          {/* SVG illustration à venir */}
          <div className="flex items-center justify-center gap-4">
            <img src={MailSendSvg} alt="Mail send" />

            <div className="flex-1 max-w-md">
              <h2 className="fr-h2 fr-mb-2w">Inscris-toi à la newsletter</h2>
              <p className="fr-mb-0 text-title-grey">1 email par mois avec les missions qui pourraient t'intéresser.</p>
            </div>
          </div>
        </div>

        <div className="flex-1">
          <form onSubmit={handleSubmit} className="max-w-md">
            <div className="fr-input-group fr-mb-2w">
              <label className="fr-label sr-only" htmlFor="newsletter-email">
                Adresse email
              </label>
              <input id="newsletter-email" type="email" required className="fr-input" placeholder="nom@email.fr" />
            </div>
            <button type="submit" className="fr-btn">
              Je m'inscris
            </button>
            <p className="fr-hint-text fr-mt-1w">Tu peux te désinscrire à tout moment</p>
          </form>
        </div>
      </div>
    </section>
  );
}
