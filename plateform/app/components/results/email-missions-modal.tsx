import { type SubmitEvent, useId, useState } from "react";
import Modal from "~/components/layout/modal";
import { PUBLISHER_ID } from "~/services/config";
import { sendMissionEmail } from "~/services/email";
import { trackEmailMissionDetailSent, trackEmailMissionsSent } from "~/services/tracking/events";
import type { EmailMissionsEntryPage } from "~/services/tracking/types";
import { useQuizStore } from "~/stores/quiz";
import { INVALID_EMAIL_FORMAT_ERROR, isValidEmail } from "~/utils/string";

interface EmailMissionsModalProps {
  userScoringId: string | undefined;
  // Page d'où part l'envoi, pour `email_missions.sent` (landing, sans annonceur connu).
  entryPage: EmailMissionsEntryPage;
  // Mission sauvegardée depuis le cœur d'une carte.
  missionId?: string;
  // Annonceur de la mission (pour `email_mission_detail.sent` depuis une carte de résultats).
  publisherId?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Modale « Garde cette mission » (clic sur le cœur d'une carte) : envoie la mission par email et inscrit
// l'utilisateur aux listes Brevo de la source `save_mission`.
export default function EmailMissionsModal({ userScoringId, entryPage, missionId, publisherId, open, onOpenChange }: EmailMissionsModalProps) {
  const distinctId = useQuizStore((s) => s.distinctId);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const emailId = useId();

  const handleClose = () => {
    onOpenChange(false);
    setEmail("");
    setError(null);
    setSuccess(false);
  };

  const handleSubmit = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!missionId) return;
    const trimmedEmail = email.trim();
    if (!isValidEmail(trimmedEmail)) {
      setError(INVALID_EMAIL_FORMAT_ERROR);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await sendMissionEmail({
        email: trimmedEmail,
        publisherId: PUBLISHER_ID,
        missionIds: [missionId],
        signupSource: "save_mission",
        ...(userScoringId ? { userScoringId, distinctId } : {}),
      });
      if (!result.email_sent) {
        setError("Cette mission n'a pas pu être envoyée. Merci de réessayer.");
        return;
      }
      // Carte de résultats (publisherId fourni, même vide car un match peut ne pas avoir d'annonceur) :
      // évènement dédié à la mission. Landing sans publisherId : évènement d'envoi.
      if (publisherId !== undefined) trackEmailMissionDetailSent({ missionId, publisherId, entrySource: "results_card", hasAlertOptIn: false });
      else trackEmailMissionsSent({ hasAlertOptIn: false, entryPage });
      setSuccess(true);
    } catch {
      setError("Une erreur est survenue. Merci de réessayer.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={handleClose} title="Garde cette mission" titleIcon="fr-icon-mail-send-fill" size="lg">
      <p>On t'envoie ta mission par mail tout de suite, puis des actualités ou des missions qui correspondent à ton profil régulièrement.</p>

      {success ? (
        <p role="status" className="flex items-center gap-2 font-bold! text-blue-france-sun! mb-8!">
          <span className="fr-icon-check-line" aria-hidden="true" />
          Ta mission a bien été envoyée ! Vérifie ta boîte mail.
        </p>
      ) : (
        <form onSubmit={handleSubmit} noValidate>
          <div className={`fr-input-group md:max-w-sm ${error ? "fr-input-group--error" : ""}`}>
            <label className="fr-label fr-sr-only" htmlFor={emailId}>
              Ton adresse email
            </label>
            <input
              id={emailId}
              name="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? `${emailId}-error` : undefined}
              className={`fr-input ${error ? "fr-input--error" : ""}`}
              placeholder="nom@email.fr"
            />
            {error && (
              <div className="fr-messages-group" id={`${emailId}-error`} role="alert">
                <p className="fr-message fr-message--error">{error}</p>
              </div>
            )}
          </div>

          <div className="flex justify-end mt-8">
            <button type="submit" disabled={loading} className="fr-btn w-full! justify-center! md:w-62!">
              {loading ? "Envoi en cours…" : "Recevoir ma mission"}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}
