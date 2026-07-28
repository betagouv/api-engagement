import { useEffect, useState } from "react";
import { Link } from "react-router";
import Modal from "~/components/layout/modal";
import {
  COOKIE_CONSENT_MODAL_ID,
  getCookieConsentPreferences,
  isCookieConsentEnabled,
  saveCookieConsent,
  subscribeCookieConsentPanelOpen,
  type ConsentChoice,
  type ConsentPreferences,
} from "~/services/cookie-consent";
import { getConsentServices, type ConsentService } from "~/services/consent-services";

function preferencesForChoice(services: ConsentService[], choice: ConsentChoice): ConsentPreferences {
  return Object.fromEntries(services.map((service) => [service.id, choice]));
}

function choiceForAll(services: ConsentService[], preferences: ConsentPreferences): ConsentChoice | null {
  if (services.every((service) => preferences[service.id] === "granted")) return "granted";
  if (services.every((service) => preferences[service.id] === "denied")) return "denied";
  return null;
}

function hasPendingChoice(services: ConsentService[], preferences: ConsentPreferences): boolean {
  return services.some((service) => preferences[service.id] === "pending");
}

export default function CookieConsentManager() {
  const services = getConsentServices();
  const [preferences, setPreferences] = useState<ConsentPreferences | null>(null);
  const [draftPreferences, setDraftPreferences] = useState<ConsentPreferences>({});
  const [modalOpen, setModalOpen] = useState(false);
  const [confirmationMessage, setConfirmationMessage] = useState("");

  useEffect(() => {
    const storedPreferences = getCookieConsentPreferences();
    setPreferences(storedPreferences);
    setDraftPreferences(storedPreferences);

    return subscribeCookieConsentPanelOpen(() => {
      setDraftPreferences(getCookieConsentPreferences());
      setModalOpen(true);
    });
  }, []);

  if (!isCookieConsentEnabled()) return null;

  const applyPreferences = (nextPreferences: ConsentPreferences) => {
    saveCookieConsent(nextPreferences);
    setPreferences(nextPreferences);
    setDraftPreferences(nextPreferences);
    setConfirmationMessage("Vos préférences ont été enregistrées.");
  };

  const updateDraftPreference = (serviceId: string, choice: ConsentChoice) => {
    setDraftPreferences((current) => ({ ...current, [serviceId]: choice }));
  };

  const allDraftChoice = choiceForAll(services, draftPreferences);

  return (
    <>
      <p className="fr-sr-only" role="status">
        {confirmationMessage}
      </p>

      {preferences && hasPendingChoice(services, preferences) && (
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
              <button type="button" className="fr-btn" title="Tout autoriser" onClick={() => applyPreferences(preferencesForChoice(services, "granted"))}>
                Tout accepter
              </button>
            </li>
            <li>
              <button type="button" className="fr-btn" title="Tout refuser" onClick={() => applyPreferences(preferencesForChoice(services, "denied"))}>
                Tout refuser
              </button>
            </li>
            <li>
              <button
                type="button"
                className="fr-btn fr-btn--secondary"
                title="Personnaliser mes préférences"
                aria-haspopup="dialog"
                onClick={() => {
                  setDraftPreferences(getCookieConsentPreferences());
                  setModalOpen(true);
                }}
              >
                Personnaliser
              </button>
            </li>
          </ul>
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Panneau de gestion des cookies" id={COOKIE_CONSENT_MODAL_ID} size="lg">
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
                  <input
                    type="radio"
                    id="consent-all-accept"
                    name="consent-all"
                    checked={allDraftChoice === "granted"}
                    onChange={() => setDraftPreferences(preferencesForChoice(services, "granted"))}
                  />
                  <label className="fr-label" htmlFor="consent-all-accept">
                    Tout accepter
                  </label>
                </div>
                <div className="fr-radio-group">
                  <input
                    type="radio"
                    id="consent-all-refuse"
                    name="consent-all"
                    checked={allDraftChoice === "denied"}
                    onChange={() => setDraftPreferences(preferencesForChoice(services, "denied"))}
                  />
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

          {services.map((service) => {
            const legendId = `consent-${service.id}-legend`;
            const descriptionId = `consent-${service.id}-desc`;
            return (
              <div key={service.id} className="fr-consent-service">
                <fieldset className="fr-fieldset" aria-labelledby={`${legendId} ${descriptionId}`} role="group">
                  <legend id={legendId} className="fr-consent-service__title">
                    {service.title}
                  </legend>
                  <div className="fr-consent-service__radios">
                    <div className="fr-radio-group">
                      <input
                        type="radio"
                        id={`consent-${service.id}-accept`}
                        name={`consent-${service.id}`}
                        checked={draftPreferences[service.id] === "granted"}
                        onChange={() => updateDraftPreference(service.id, "granted")}
                      />
                      <label className="fr-label" htmlFor={`consent-${service.id}-accept`}>
                        Accepter
                      </label>
                    </div>
                    <div className="fr-radio-group">
                      <input
                        type="radio"
                        id={`consent-${service.id}-refuse`}
                        name={`consent-${service.id}`}
                        checked={draftPreferences[service.id] === "denied"}
                        onChange={() => updateDraftPreference(service.id, "denied")}
                      />
                      <label className="fr-label" htmlFor={`consent-${service.id}-refuse`}>
                        Refuser
                      </label>
                    </div>
                  </div>
                  <p id={descriptionId} className="fr-consent-service__desc">
                    {service.description}
                  </p>
                </fieldset>
              </div>
            );
          })}

          <ul className="fr-consent-manager__buttons fr-btns-group fr-btns-group--right fr-btns-group--inline-sm">
            <li>
              <button
                type="button"
                className="fr-btn"
                disabled={hasPendingChoice(services, draftPreferences)}
                onClick={() => {
                  applyPreferences(draftPreferences);
                  setModalOpen(false);
                }}
              >
                Confirmer mes choix
              </button>
            </li>
          </ul>
        </div>
      </Modal>
    </>
  );
}
