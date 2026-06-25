import { createOrUpdateContact } from "@/services/brevo";

// Liste Brevo dediee aux inscrits newsletter (parcours public, sans quiz).
// TODO: remplacer par l'identifiant de la vraie liste newsletter Brevo.
// Par defaut on reutilise la liste des contacts engagement (22) pour ne rien casser en attendant.
const BREVO_NEWSLETTER_LIST_ID = 22;

export const subscribeToNewsletter = async (params: { email: string; distinctId?: string }): Promise<{ ok: boolean }> => {
  const result = await createOrUpdateContact({
    email: params.email,
    distinctId: params.distinctId,
    missionAlertEnabled: false,
    listId: BREVO_NEWSLETTER_LIST_ID,
  });

  return { ok: result.ok };
};
