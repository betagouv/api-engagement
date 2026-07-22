import { useEffect, useState } from "react";
import { Link } from "react-router";
import { COOKIE_CONSENT_MODAL_ID, getCookieConsentStatus, isCookieConsentEnabled, saveCookieConsent } from "~/services/cookie-consent";
import { openDsfrModal } from "~/services/dsfr";
import type { TrackingConsentStatus } from "~/services/tracking";

type ConsentChoice = Exclude<TrackingConsentStatus, "pending">;

function choiceFromStatus(status: TrackingConsentStatus): ConsentChoice | null {
  return status === "pending" ? null : status;
}

export default function CookieConsentManager() {
  const [status, setStatus] = useState<TrackingConsentStatus | null>(null);
  const [draftChoice, setDraftChoice] = useState<ConsentChoice | null>(null);

  useEffect(() => {
    const storedStatus = getCookieConsentStatus();
    setStatus(storedStatus);
    setDraftChoice(choiceFromStatus(storedStatus));

    const modal = document.getElementById(COOKIE_CONSENT_MODAL_ID);
    const resetDraftChoice = () => setDraftChoice(choiceFromStatus(getCookieConsentStatus()));
    modal?.addEventListener("dsfr.disclose", resetDraftChoice);
    return () => modal?.removeEventListener("dsfr.disclose", resetDraftChoice);
  }, []);

  if (!isCookieConsentEnabled()) return null;

  const applyChoice = (choice: ConsentChoice) => {
    saveCookieConsent(choice);
    setStatus(choice);
    setDraftChoice(choice);
  };

  return (
    <>
      {status === "pending" && (
        <div className="fr-consent-banner">
          <h2 className="fr-h6">À propos des cookies sur la Plateforme de l'Engagement</h2>
          <div className="fr-consent-banner__content">
            <p className="fr-text--sm">
              Bienvenue ! Ce site utilise des cookies pour mesurer la fréquentation du site afin d’en améliorer le fonctionnement et l’administration et, avec votre accord, pour
              évaluer la performance des campagnes d’informations gouvernementales et améliorer votre expérience utilisateur. Consultez notre{" "}
              <Link to="/politique-de-confidentialite">politique de confidentialité</Link>.
            </p>
          </div>
          <ul className="fr-consent-banner__buttons fr-btns-group fr-btns-group--right fr-btns-group--inline-reverse fr-btns-group--inline-sm">
            <li>
              <button type="button" className="fr-btn" title="Autoriser la mesure d'audience persistante" onClick={() => applyChoice("granted")}>
                Tout accepter
              </button>
            </li>
            <li>
              <button type="button" className="fr-btn" title="Refuser la mesure d'audience persistante" onClick={() => applyChoice("denied")}>
                Tout refuser
              </button>
            </li>
            <li>
              <button
                type="button"
                className="fr-btn fr-btn--secondary"
                title="Personnaliser la mesure d'audience"
                aria-haspopup="dialog"
                onClick={() => void openDsfrModal(COOKIE_CONSENT_MODAL_ID)}
              >
                Personnaliser
              </button>
            </li>
          </ul>
        </div>
      )}

      <dialog id={COOKIE_CONSENT_MODAL_ID} className="fr-modal" aria-labelledby={`${COOKIE_CONSENT_MODAL_ID}-title`}>
        <div className="fr-container fr-container--fluid fr-container-md">
          <div className="fr-grid-row fr-grid-row--center">
            <div className="fr-col-12 fr-col-md-10 fr-col-lg-8">
              <div className="fr-modal__body">
                <div className="fr-modal__header">
                  <button type="button" className="fr-btn fr-btn--close" title="Fermer" aria-controls={COOKIE_CONSENT_MODAL_ID}>
                    Fermer
                  </button>
                </div>
                <div className="fr-modal__content">
                  <h2 id={`${COOKIE_CONSENT_MODAL_ID}-title`} className="fr-modal__title">
                    Panneau de gestion des cookies
                  </h2>
                  <div className="fr-consent-manager">
                    <div className="fr-consent-service fr-consent-manager__header">
                      <fieldset className="fr-fieldset">
                        <legend className="fr-consent-service__title">
                          Préférences pour tous les services.{" "}
                          <Link to="/politique-de-confidentialite" reloadDocument>
                            Politique de confidentialité
                          </Link>
                        </legend>
                        <div className="fr-consent-service__radios">
                          <div className="fr-radio-group">
                            <input type="radio" id="consent-all-accept" name="consent-all" checked={draftChoice === "granted"} onChange={() => setDraftChoice("granted")} />
                            <label className="fr-label" htmlFor="consent-all-accept">
                              Tout accepter
                            </label>
                          </div>
                          <div className="fr-radio-group">
                            <input type="radio" id="consent-all-refuse" name="consent-all" checked={draftChoice === "denied"} onChange={() => setDraftChoice("denied")} />
                            <label className="fr-label" htmlFor="consent-all-refuse">
                              Tout refuser
                            </label>
                          </div>
                        </div>
                      </fieldset>
                    </div>

                    <div className="fr-consent-service">
                      <fieldset className="fr-fieldset" aria-labelledby="consent-mandatory-legend consent-mandatory-desc" role="group">
                        <legend id="consent-mandatory-legend" className="fr-consent-service__title">
                          Cookies obligatoires
                        </legend>
                        <div className="fr-consent-service__radios">
                          <div className="fr-radio-group">
                            <input type="radio" id="consent-mandatory-accept" name="consent-mandatory" checked disabled readOnly />
                            <label className="fr-label" htmlFor="consent-mandatory-accept">
                              Accepter
                            </label>
                          </div>
                          <div className="fr-radio-group">
                            <input type="radio" id="consent-mandatory-refuse" name="consent-mandatory" disabled />
                            <label className="fr-label" htmlFor="consent-mandatory-refuse">
                              Refuser
                            </label>
                          </div>
                        </div>
                        <p id="consent-mandatory-desc" className="fr-consent-service__desc">
                          Ce site utilise des cookies nécessaires à son bon fonctionnement qui ne peuvent pas être désactivés.
                        </p>
                      </fieldset>
                    </div>

                    <div className="fr-consent-service">
                      <fieldset className="fr-fieldset" aria-labelledby="consent-analytics-legend consent-analytics-desc" role="group">
                        <legend id="consent-analytics-legend" className="fr-consent-service__title">
                          Mesure d'audience
                        </legend>
                        <div className="fr-consent-service__radios">
                          <div className="fr-radio-group">
                            <input
                              type="radio"
                              id="consent-analytics-accept"
                              name="consent-analytics"
                              checked={draftChoice === "granted"}
                              onChange={() => setDraftChoice("granted")}
                            />
                            <label className="fr-label" htmlFor="consent-analytics-accept">
                              Accepter
                            </label>
                          </div>
                          <div className="fr-radio-group">
                            <input
                              type="radio"
                              id="consent-analytics-refuse"
                              name="consent-analytics"
                              checked={draftChoice === "denied"}
                              onChange={() => setDraftChoice("denied")}
                            />
                            <label className="fr-label" htmlFor="consent-analytics-refuse">
                              Refuser
                            </label>
                          </div>
                        </div>
                        <p id="consent-analytics-desc" className="fr-consent-service__desc">
                          PostHog mesure l'utilisation de la plateforme afin d'améliorer le parcours et les missions proposées. Sans accord, cette mesure reste cookieless et ne
                          permet pas de reconnaître votre navigateur entre plusieurs journées.
                        </p>
                      </fieldset>
                    </div>

                    <ul className="fr-consent-manager__buttons fr-btns-group fr-btns-group--right fr-btns-group--inline-sm">
                      <li>
                        <button
                          type="button"
                          className="fr-btn"
                          aria-controls={COOKIE_CONSENT_MODAL_ID}
                          disabled={draftChoice === null}
                          onClick={() => draftChoice && applyChoice(draftChoice)}
                        >
                          Confirmer mes choix
                        </button>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </dialog>
    </>
  );
}
