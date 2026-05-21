import { type FormEvent, useId, useState } from "react";
import Modal from "~/components/layout/modal";
import { sendMissionEmail } from "~/services/email";
import { PUBLISHER_ID_API_ENGAGEMENT } from "~/services/config";
import { updateUserScoring } from "~/services/user-scoring";
import { useQuizStore } from "~/stores/quiz";
import MailIllustration from "~/components/ui/mail-illustration";

interface EmailMissionsModalProps {
  userScoringId: string | undefined;
}

export default function EmailMissionsModal({ userScoringId }: EmailMissionsModalProps) {
  const distinctId = useQuizStore((s) => s.distinctId);
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const emailId = useId();
  const nearbyId = useId();

  const handleClose = () => {
    setOpen(false);
    setError(null);
    setSuccess(false);
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!userScoringId) return;

    const form = e.currentTarget;
    const email = (form.elements.namedItem("email") as HTMLInputElement).value;
    const missionAlertEnabled = (form.elements.namedItem("nearby") as HTMLInputElement).checked;

    setSubmitting(true);
    setError(null);

    try {
      await updateUserScoring(userScoringId, { missionAlertEnabled, distinctId });
      const result = await sendMissionEmail({ email, publisherId: PUBLISHER_ID_API_ENGAGEMENT, userScoringId, distinctId });
      if (!result.email_sent) {
        setError("Aucune mission n'a pu être envoyée. Réessaie depuis la page de résultats.");
      } else {
        setSuccess(true);
      }
    } catch {
      setError("Une erreur est survenue. Merci de réessayer.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="fr-btn fr-btn--secondary fr-icon-mail-line fr-btn--icon-left w-full! justify-center!">
        Recevoir ces 5 missions par e-mail
      </button>

      <Modal open={open} onClose={handleClose} title="Reçois tes missions par email" beforeTitle={<MailIllustration className="mb-4 h-[120px]" />}>
        {success ? (
          <div className="flex flex-col items-center gap-4 py-4 text-center">
            <div className="fr-alert fr-alert--success w-full">
              <p>Tes missions ont bien été envoyées ! Vérifie ta boîte mail.</p>
            </div>
            <button type="button" onClick={handleClose} className="fr-btn fr-btn--secondary w-full! justify-center!">
              Fermer
            </button>
          </div>
        ) : (
          <>
            <p className="fr-text--lead fr-mb-2w">On t'envoie ta sélection de 5 missions pour que tu puisses les retrouver facilement.</p>

            <form onSubmit={handleSubmit}>
              {error && (
                <div className="fr-alert fr-alert--error fr-mb-2w">
                  <p>{error}</p>
                </div>
              )}

              <div className="fr-input-group fr-mb-2w">
                <label className="fr-label" htmlFor={emailId}>
                  Adresse email
                </label>
                <input id={emailId} name="email" type="email" required className="fr-input" placeholder="nom@email.fr" />
              </div>

              <div className="fr-checkbox-group fr-mb-2w">
                <input id={nearbyId} name="nearby" type="checkbox" />
                <label className="fr-label" htmlFor={nearbyId}>
                  Recevoir aussi les nouvelles missions près de chez moi
                </label>
                <div className="fr-messages-group">
                  <p className="fr-hint-text">1 email maximum par semaine. Ton adresse sera uniquement utilisée pour t'envoyer ces missions.</p>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <button type="submit" disabled={submitting} className="fr-btn w-full! justify-center!">
                  {submitting ? "Envoi en cours…" : "Recevoir mes missions"}
                </button>
                <button type="button" onClick={handleClose} disabled={submitting} className="fr-btn fr-btn--secondary w-full! justify-center!">
                  Continuer sans recevoir ma sélection
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
