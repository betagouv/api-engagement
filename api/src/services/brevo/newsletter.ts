import { PUBLISHER_IDS } from "@/config";
import type { SignupSource } from "@engagement/dto";
import { createOrUpdateContact } from "./contact";

// Listes Brevo de la plateforme, alimentees selon le point d'entree de l'inscription (newsletter seule sans source).
// Chaque liste est independante : l'utilisateur peut se desinscrire de l'une sans quitter les autres.
const RECOMMENDATION_USERS_BREVO_LIST_ID = 22; // « Produit - Utilisateurs recommandations »
const NEWSLETTER_BREVO_LIST_ID = 23; // « Newsletter »
const FUTURE_RECOMMENDATIONS_BREVO_LIST_ID = 26; // « Recommandations futures »

const BREVO_LISTS_BY_SIGNUP_SOURCE: Record<SignupSource, number[]> = {
  quiz: [RECOMMENDATION_USERS_BREVO_LIST_ID, NEWSLETTER_BREVO_LIST_ID, FUTURE_RECOMMENDATIONS_BREVO_LIST_ID],
  save_mission: [RECOMMENDATION_USERS_BREVO_LIST_ID, NEWSLETTER_BREVO_LIST_ID, FUTURE_RECOMMENDATIONS_BREVO_LIST_ID],
  result_list: [FUTURE_RECOMMENDATIONS_BREVO_LIST_ID],
};

type SubscribeResult = { ok: true } | { ok: false; reason: "publisher_not_allowed" | "brevo_failed" };

export const subscribeToNewsletter = async (params: {
  email: string;
  publisherId: string;
  distinctId?: string;
  userScoringId?: string;
  missionAlertEnabled?: boolean;
  signupSource?: SignupSource;
}): Promise<SubscribeResult> => {
  // Seule la plateforme a une newsletter : les autres publishers sont refuses.
  if (params.publisherId !== PUBLISHER_IDS.PLATEFORME_ENGAGEMENT) {
    return { ok: false, reason: "publisher_not_allowed" };
  }

  const result = await createOrUpdateContact({
    email: params.email,
    distinctId: params.distinctId,
    userScoringId: params.userScoringId,
    missionAlertEnabled: params.missionAlertEnabled ?? false,
    listIds: params.signupSource ? BREVO_LISTS_BY_SIGNUP_SOURCE[params.signupSource] : [NEWSLETTER_BREVO_LIST_ID],
    signupSource: params.signupSource,
  });

  return result.ok ? { ok: true } : { ok: false, reason: "brevo_failed" };
};
