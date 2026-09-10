import { type SubmitEvent, useId, useState } from "react";
import Modal from "~/components/layout/modal";
import MailIllustration from "~/components/ui/mail-illustration";
import { PUBLISHER_ID } from "~/services/config";
import { sendMissionEmail } from "~/services/email";
import { trackEmailMissionDetailSent, trackEmailMissionsSent } from "~/services/tracking/events";
import { updateUserScoring } from "~/services/user-scoring";
import { useQuizStore } from "~/stores/quiz";

interface EmailMissionsModalProps {
  userScoringId: string | undefined;
  // Renseigné depuis le bouton email d'une carte : la modale n'envoie que cette mission
  // (wording au singulier), sinon toute la sélection de résultats.
  missionId?: string;
  // Annonceur de la mission (pour `email_mission_detail.sent` en envoi mono-mission depuis une carte).
  publisherId?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  hideTrigger?: boolean;
}

export default function EmailMissionsModal({ userScoringId, missionId, publisherId, open: controlledOpen, onOpenChange, hideTrigger }: EmailMissionsModalProps) {
  const distinctId = useQuizStore((s) => s.distinctId);
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const emailId = useId();
  const nearbyId = useId();

  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : uncontrolledOpen;
  const setOpen = (value: boolean) => {
    if (isControlled) onOpenChange?.(value);
    else setUncontrolledOpen(value);
  };

  const handleClose = () => {
    setOpen(false);
    setError(null);
    setSuccess(false);
  };

  const handleSubmit = async (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    // Hors parcours de quiz (page défis), il n'y a pas de scoring : l'API accepte alors `missionIds`
    // seul, mais on ne peut pas enregistrer l'alerte, faute d'utilisateur à qui la rattacher.
    if (!userScoringId && !missionId) return;

    const form = e.currentTarget;
    const email = (form.elements.namedItem("email") as HTMLInputElement).value;
    const nearby = form.elements.namedItem("nearby") as HTMLInputElement | null;
    const missionAlertEnabled = nearby?.checked ?? false;

    setSubmitting(true);
    setError(null);

    try {
      if (userScoringId) await updateUserScoring(userScoringId, { missionAlertEnabled, distinctId });
      const result = await sendMissionEmail({ email, publisherId: PUBLISHER_ID, userScoringId, distinctId, missionIds: missionId ? [missionId] : undefined });
      if (!result.email_sent) {
        setError(userScoringId ? "Aucune mission n'a pu être envoyée. Réessaie depuis la page de résultats." : "Cette mission n'a pas pu être envoyée. Merci de réessayer.");
      } else {
        // Envoi mono-mission depuis une carte de résultats (publisherId fourni, même vide car un
        // match peut ne pas avoir d'annonceur) : évènement dédié à la mission. Sinon (sélection
        // complète, ou landing sans publisherId) : évènement de sélection.
        if (missionId && publisherId !== undefined) trackEmailMissionDetailSent({ missionId, publisherId, entrySource: "results_card", hasAlertOptIn: missionAlertEnabled });
        else trackEmailMissionsSent({ hasAlertOptIn: missionAlertEnabled });
        setSuccess(true);
      }
    } catch (err) {
      if (err instanceof Error && err.message === "INVALID_BODY") {
        setError("Le format de l'adresse email n'est pas valide. Le format attendu est : nom@email.fr");
      } else {
        setError("Une erreur est survenue. Merci de réessayer.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      {!hideTrigger && (
        <button type="button" onClick={() => setOpen(true)} className="fr-btn fr-btn--secondary fr-icon-mail-line fr-btn--icon-left w-full! justify-center!">
          Recevoir ces 5 missions par email
        </button>
      )}

      <Modal
        open={open}
        onClose={handleClose}
        title={missionId ? "Reçois ta mission par email" : "Reçois tes missions par email"}
        beforeTitle={<MailIllustration className="mx-auto mb-6 h-[100px]" />}
        className=""
      >
        {success ? (
          <div className="flex flex-col items-center gap-4 py-4 text-center">
            <div role="status" className="fr-alert fr-alert--success w-full">
              <p>{missionId ? "Ta mission a bien été envoyée !" : "Tes missions ont bien été envoyées !"} Vérifie ta boîte mail.</p>
            </div>
            <button type="button" onClick={handleClose} className="fr-btn fr-btn--secondary w-full! justify-center!">
              Fermer
            </button>
          </div>
        ) : (
          <>
            <p className="fr-text--lead fr-mb-2w">
              {missionId
                ? "On t'envoie cette mission pour que tu puisses la retrouver facilement."
                : "On t'envoie ta sélection de 5 missions pour que tu puisses les retrouver facilement."}
            </p>

            <form onSubmit={handleSubmit}>
              <p className="fr-hint-text fr-mb-2w">
                Les champs marqués d'un <span aria-hidden="true">*</span> sont obligatoires.
              </p>

              <div className={`fr-input-group fr-mb-2w ${error ? "fr-input-group--error" : ""}`}>
                <label className="fr-label" htmlFor={emailId}>
                  Adresse email <span aria-hidden="true">*</span>
                </label>
                <input
                  id={emailId}
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  aria-required="true"
                  aria-invalid={error ? true : undefined}
                  aria-describedby={error ? `${emailId}-error` : undefined}
                  className="fr-input"
                  placeholder="nom@email.fr"
                />
                {error && (
                  <div className="fr-messages-group" id={`${emailId}-error`} role="alert">
                    <p className="fr-message fr-message--error">{error}</p>
                  </div>
                )}
              </div>

              {/* L'alerte se rattache au scoring de l'utilisateur : sans quiz fait, on ne la propose pas. */}
              {userScoringId && (
                <div className="fr-checkbox-group fr-mb-2w">
                  <input id={nearbyId} name="nearby" type="checkbox" />
                  <label className="fr-label" htmlFor={nearbyId}>
                    Recevoir aussi les nouvelles missions près de chez moi
                  </label>
                  <div className="fr-messages-group pl-8">
                    <p className="fr-hint-text">1 email maximum par semaine. Ton adresse sera uniquement utilisée pour t'envoyer ces missions.</p>
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-2">
                <button type="submit" disabled={submitting} className="fr-btn w-full! justify-center!">
                  {submitting ? "Envoi en cours…" : missionId ? "Recevoir ma mission" : "Recevoir mes missions"}
                </button>
                <button type="button" onClick={handleClose} disabled={submitting} className="fr-btn fr-btn--secondary w-full! justify-center!">
                  {missionId ? "Continuer sans recevoir ma mission" : "Continuer sans recevoir ma sélection"}
                </button>
                <p className="fr-hint-text text-center fr-mb-0!">Tu peux te désinscrire à tout moment</p>
              </div>
            </form>
          </>
        )}
      </Modal>
    </>
  );
}
