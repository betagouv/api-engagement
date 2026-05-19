import { type FormEvent, useId, useState } from "react";
import Modal from "~/components/layout/modal";
import { sendMissionEmail } from "~/services/email";
import { PUBLISHER_ID_API_ENGAGEMENT } from "~/services/config";
import { updateUserScoring } from "~/services/user-scoring";
import { useQuizStore } from "~/stores/quiz";

interface EmailMissionModalProps {
  missionId: string;
  userScoringId?: string;
}

export default function EmailMissionModal({ missionId, userScoringId }: EmailMissionModalProps) {
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
    const form = e.currentTarget;
    const email = (form.elements.namedItem("email") as HTMLInputElement).value;
    const missionAlertEnabled = (form.elements.namedItem("nearby") as HTMLInputElement | null)?.checked ?? false;

    setSubmitting(true);
    setError(null);

    if (userScoringId) {
      try {
        await updateUserScoring(userScoringId, { missionAlertEnabled }, distinctId);
      } catch {
        // Échec non bloquant : le scoring peut être expiré ou appartenir à un autre navigateur
      }
    }

    try {
      const result = await sendMissionEmail({
        email,
        publisherId: PUBLISHER_ID_API_ENGAGEMENT,
        missionIds: [missionId],
        ...(userScoringId ? { userScoringId, distinctId } : {}),
      });
      if (!result.email_sent) {
        setError("La mission est introuvable et n'a pas pu être envoyée.");
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
      <button type="button" onClick={() => setOpen(true)} className="fr-btn fr-btn--secondary fr-mt-2w w-full! justify-center!">
        Recevoir cette mission par e-mail
      </button>

      <Modal open={open} onClose={handleClose} title="Reçois ta mission par email" titleIcon="fr-icon-mail-line">
        {success ? (
          <div className="fr-alert fr-alert--success">
            <p>La mission a bien été envoyée ! Vérifie ta boîte mail.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <p className="fr-mb-2w">On t'envoie ta mission pour que tu puisses la retrouver facilement.</p>

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

            {userScoringId && (
              <div className="fr-checkbox-group fr-mb-2w">
                <input id={nearbyId} name="nearby" type="checkbox" />
                <label className="fr-label" htmlFor={nearbyId}>
                  Recevoir aussi les nouvelles missions près de chez moi
                </label>
                <div className="fr-messages-group">
                  <p className="fr-hint-text">1 email maximum par semaine. Ton adresse sera uniquement utilisée pour t'envoyer ces missions.</p>
                </div>
              </div>
            )}

            <div className="flex justify-end">
              <button type="submit" disabled={submitting} className="fr-btn">
                {submitting ? "Envoi en cours…" : "Recevoir ma mission"}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </>
  );
}
