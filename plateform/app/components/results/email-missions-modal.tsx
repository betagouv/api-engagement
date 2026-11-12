import { type SubmitEvent, useEffect, useId, useState } from "react";
import { useLocation } from "react-router";
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
import type { EmailCaptureSkipMethod, EmailMissionsEntryPage, MissionDetailNavState } from "~/services/tracking/types";
import { resolveEmailMissionDetailEntrySource } from "~/services/tracking/utils";
import { useQuizStore } from "~/stores/quiz";
import { INVALID_EMAIL_FORMAT_ERROR, isValidEmail } from "~/utils/string";

type SaveMissionContext = Extract<EmailCaptureContext, { signupSource: "save_mission" | "mission_detail" }>;

interface EmailMissionsModalProps {
  userScoringId: string | undefined;
  // `save_mission` : cœur d'une carte. `mission_detail` : CTA de la fiche mission. Mêmes listes Brevo, origine distincte.
  signupSource?: "save_mission" | "mission_detail";
  // Page d'où part l'envoi, pour `email_missions.sent` (landing, sans annonceur connu). Inutile sur la fiche mission.
  entryPage?: EmailMissionsEntryPage;
  // Mission sauvegardée depuis le cœur d'une carte.
  missionId?: string;
  // Annonceur de la mission (pour `email_mission_detail.sent` depuis une carte de résultats).
  publisherId?: string;
  // Position de la mission dans les résultats (`email_capture.*`), absente hors résultats.
  rank?: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Modale « Reçois cette mission par e-mail » (cœur d'une carte ou CTA de la fiche mission) : envoie la mission par email
// et inscrit l'utilisateur aux listes Brevo de la source `save_mission` ou `mission_detail`.
export default function EmailMissionsModal({ userScoringId, signupSource = "save_mission", entryPage, missionId, publisherId, rank, open, onOpenChange }: EmailMissionsModalProps) {
  const distinctId = useQuizStore((s) => s.distinctId);
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  // Email accepté par l'API (même si l'envoi a échoué) : ni nouveau `submitted` au réessai, ni `skipped` à la fermeture.
  const [captured, setCaptured] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const emailId = useId();

  // `entry_source` : provenance de la fiche, ou carte de résultats (publisherId fourni) ; absent sur les landings.
  const navState = location.state as MissionDetailNavState | null;
  const missionDetailEntrySource = resolveEmailMissionDetailEntrySource(navState?.entrySource, Boolean(userScoringId));
  const cardEntrySource = publisherId !== undefined ? "results_card" : undefined;
  const entrySource = signupSource === "mission_detail" ? missionDetailEntrySource : cardEntrySource;
  const captureContext: SaveMissionContext | null = missionId ? { signupSource, missionId, publisherId: publisherId || undefined, rank, entrySource } : null;

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
      trackEmailCaptureFailed({ signupSource, errorType: "invalid_format" });
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
        signupSource,
        ...(userScoringId ? { userScoringId, distinctId } : {}),
      });
      // Contact accepté par l'API : `submitted` même si l'envoi échoue ensuite (`email_sent` false).
      if (captureContext && !captured) trackEmailCaptureSubmitted(captureContext);
      setCaptured(true);
      if (!result.email_sent) {
        setError("Cette mission n'a pas pu être envoyée. Merci de réessayer.");
        return;
      }
      // Fiche mission ou carte de résultats (publisherId fourni, même vide car un match peut ne pas avoir d'annonceur) :
      // évènement dédié à la mission. Landing sans publisherId : évènement d'envoi.
      if (signupSource === "mission_detail")
        trackEmailMissionDetailSent({ missionId, publisherId: publisherId ?? "", entrySource: missionDetailEntrySource, hasAlertOptIn: false });
      else if (publisherId !== undefined) trackEmailMissionDetailSent({ missionId, publisherId, entrySource: "results_card", hasAlertOptIn: false });
      else if (entryPage) trackEmailMissionsSent({ hasAlertOptIn: false, entryPage });
      setSuccess(true);
    } catch {
      trackEmailCaptureFailed({ signupSource, errorType: "api_error" });
      setError("Une erreur est survenue. Merci de réessayer.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={() => handleClose("close")} title="Reçois cette mission par e-mail" titleIcon="fr-icon-mail-send-fill">
      <p>On te l'envoie tout de suite pour que tu la retrouves facilement.</p>

      {success ? (
        <p role="status" className="flex items-center gap-2 font-bold! text-blue-france-sun! mb-0!">
          <span className="fr-icon-check-line" aria-hidden="true" />
          C'est envoyé ! Vérifie ta boîte mail (et tes spams).
        </p>
      ) : (
        <form onSubmit={handleSubmit} noValidate>
          <div className={`fr-input-group ${error ? "fr-input-group--error" : ""}`}>
            <label className="fr-label" htmlFor={emailId}>
              Ton adresse e-mail
              <span className="fr-hint-text">Format attendu : nom@domaine.fr</span>
            </label>
            <input
              id={emailId}
              name="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              aria-invalid={error ? true : undefined}
              aria-describedby={`${emailId}-consent ${error ? `${emailId}-error` : ""}`}
              className={`fr-input ${error ? "fr-input--error" : ""}`}
            />
            {error && (
              <div className="fr-messages-group" id={`${emailId}-error`} role="alert">
                <p className="fr-message fr-message--error">{error}</p>
              </div>
            )}
          </div>
          <p id={`${emailId}-consent`} className="fr-hint-text">
            En laissant ton e-mail, tu recevras aussi 1 e-mail par mois avec de nouvelles missions et des actualités sur l'engagement. Tu peux te désinscrire en un clic depuis
            chaque e-mail.
          </p>

          {/* Le bas de `fr-modal__content` (3,5 rem / 4 rem) est ramené à l'espace d'un `fr-modal__footer` DSFR sous les boutons (1 rem / 2 rem). */}
          <div className="flex flex-col-reverse gap-4 mt-8 -mb-10 md:flex-row md:justify-end md:-mb-8">
            <button type="button" onClick={() => handleClose("continue_without_email")} disabled={loading} className="fr-btn fr-btn--secondary w-full! justify-center! md:w-auto!">
              Retour
            </button>
            <button type="submit" disabled={loading} className="fr-btn w-full! justify-center! md:w-auto!">
              {loading ? "Envoi en cours…" : "Recevoir la mission"}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}
