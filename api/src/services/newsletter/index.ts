import { PUBLISHER_IDS } from "@/config";
import { createOrUpdateContact } from "@/services/brevo";

// Liste Brevo de newsletter par publisher autorise sur la route /newsletter.
// La route n'est pas dediee a la seule plateforme : chaque publisher present ici
// inscrit ses contacts dans sa propre liste Brevo. Un publisher absent est refuse.
// TODO: remplacer 22 par l'identifiant de la vraie liste newsletter Brevo de la plateforme.
// Par defaut on reutilise la liste des contacts engagement (22) pour ne rien casser en attendant.
const NEWSLETTER_BREVO_LIST_BY_PUBLISHER: Record<string, number> = {
  [PUBLISHER_IDS.API_ENGAGEMENT]: 22,
};

type SubscribeResult = { ok: true } | { ok: false; reason: "publisher_not_allowed" | "brevo_failed" };

export const subscribeToNewsletter = async (params: {
  email: string;
  publisherId: string;
  distinctId?: string;
  userScoringId?: string;
  missionAlertEnabled?: boolean;
}): Promise<SubscribeResult> => {
  const listId = NEWSLETTER_BREVO_LIST_BY_PUBLISHER[params.publisherId];
  if (!listId) {
    return { ok: false, reason: "publisher_not_allowed" };
  }

  const result = await createOrUpdateContact({
    email: params.email,
    distinctId: params.distinctId,
    userScoringId: params.userScoringId,
    missionAlertEnabled: params.missionAlertEnabled ?? false,
    listId,
  });

  return result.ok ? { ok: true } : { ok: false, reason: "brevo_failed" };
};
