import { type SubmitEvent, useEffect, useId, useState } from "react";
import Modal from "~/components/layout/modal";
import { PUBLISHER_ID } from "~/services/config";
import { sendMissionEmail } from "~/services/email";
import {
  type EmailCaptureContext,
  trackEmailCaptureFailed,
  trackEmailCaptureSkipped,
  trackEmailCaptureSubmitted,
  trackEmailCaptureViewed,
  trackEmailMissionDetailSent,
  trackEmailMissionsSent,
} from "~/services/tracking/events";
import type { EmailCaptureSkipMethod, EmailMissionsEntryPage } from "~/services/tracking/types";
import { useQuizStore } from "~/stores/quiz";
import { INVALID_EMAIL_FORMAT_ERROR, isValidEmail } from "~/utils/string";

type SaveMissionContext = Extract<EmailCaptureContext, { signupSource: "save_mission" }>;

interface EmailMissionsModalProps {
  userScoringId: string | undefined;
  // Page d'où part l'envoi, pour `email_missions.sent` (landing, sans annonceur connu).
  entryPage: EmailMissionsEntryPage;
  // Mission sauvegardée depuis le cœur d'une carte.
  missionId?: string;
  // Annonceur de la mission (pour `email_mission_detail.sent` depuis une carte de résultats).
  publisherId?: string;
  // Position de la mission dans les résultats (`email_capture.*`), absente hors résultats.
  rank?: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Modale « Garde cette mission » (clic sur le cœur d'une carte) : envoie la mission par email et inscrit
// l'utilisateur aux listes Brevo de la source `save_mission`.
export default function EmailMissionsModal({ userScoringId, entryPage, missionId, publisherId, rank, open, onOpenChange }: EmailMissionsModalProps) {
  const distinctId = useQuizStore((s) => s.distinctId);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  // Email accepté par l'API (même si l'envoi a échoué) : ni nouveau `submitted` au réessai, ni `skipped` à la fermeture.
  const [captured, setCaptured] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const emailId = useId();

  // `entry_source` n'a de sens que sur une carte de résultats (publisherId fourni) ; absent sur les landings.
  const captureContext: SaveMissionContext | null = missionId
    ? { signupSource: "save_mission", missionId, publisherId: publisherId || undefined, rank, entrySource: publisherId !== undefined ? "results_card" : undefined }
    : null;

  // Ouverture de la modale = clic sur le cœur (simultanés) : un seul `viewed` par ouverture.
  useEffect(() => {
    if (open && captureContext) trackEmailCaptureViewed(captureContext);
  }, [open, missionId]);

  const handleClose = (skipMethod: EmailCaptureSkipMethod = "close") => {
    if (open && !captured && captureContext) trackEmailCaptureSkipped(captureContext, skipMethod);
    onOpenChange(false);
    setEmail("");
    setError(null);
    setSuccess(false);
    setCaptured(false);
  };

  const handleSubmit = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!missionId) return;
    const trimmedEmail = email.trim();
    if (!isValidEmail(trimmedEmail)) {
      trackEmailCaptureFailed({ signupSource: "save_mission", errorType: "invalid_format" });
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
      // Contact accepté par l'API : `submitted` même si l'envoi échoue ensuite (`email_sent` false).
      if (captureContext && !captured) trackEmailCaptureSubmitted(captureContext);
      setCaptured(true);
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
      trackEmailCaptureFailed({ signupSource: "save_mission", errorType: "api_error" });
      setError("Une erreur est survenue. Merci de réessayer.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={() => handleClose("close")} title="Garde cette mission" titleIcon="fr-icon-mail-send-fill" size="lg">
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
              Ton adresse e-mail
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

          <div className="flex flex-col-reverse gap-4 mt-8 md:flex-row md:justify-end">
            <button type="button" onClick={() => handleClose("continue_without_email")} disabled={loading} className="fr-btn fr-btn--secondary w-full! justify-center! md:w-auto!">
              Continuer sans recevoir ma mission
            </button>
            <button type="submit" disabled={loading} className="fr-btn w-full! justify-center! md:w-62!">
              {loading ? "Envoi en cours…" : "Recevoir ma mission"}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}
