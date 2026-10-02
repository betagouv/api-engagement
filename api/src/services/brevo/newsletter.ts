import { PUBLISHER_IDS } from "@/config";
import type { SignupSource } from "@engagement/dto";
import { createOrUpdateContact } from "./contact";

const RECOMMENDATION_USERS_BREVO_LIST_ID = 22; // « Produit - Utilisateurs recommandations »
const NEWSLETTER_BREVO_LIST_ID = 23; // « Newsletter »
const FUTURE_RECOMMENDATIONS_BREVO_LIST_ID = 26; // « Recommandations futures »

// Listes Brevo par publisher autorise sur la route /newsletter, alimentees selon le point d'entree de l'inscription.
// `default` sert quand aucune source n'est fournie ou que le publisher n'a pas de listes dediees a cette source.
// Un publisher absent est refuse. Chaque liste est independante : l'utilisateur peut se desinscrire de l'une sans quitter les autres.
const NEWSLETTER_BREVO_LISTS_BY_PUBLISHER: Record<string, { default: number[] } & Partial<Record<SignupSource, number[]>>> = {
  [PUBLISHER_IDS.PLATEFORME_ENGAGEMENT]: {
    default: [NEWSLETTER_BREVO_LIST_ID],
    quiz: [RECOMMENDATION_USERS_BREVO_LIST_ID, NEWSLETTER_BREVO_LIST_ID, FUTURE_RECOMMENDATIONS_BREVO_LIST_ID],
    save_mission: [RECOMMENDATION_USERS_BREVO_LIST_ID, NEWSLETTER_BREVO_LIST_ID, FUTURE_RECOMMENDATIONS_BREVO_LIST_ID],
    result_list: [FUTURE_RECOMMENDATIONS_BREVO_LIST_ID],
  },
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
  const lists = NEWSLETTER_BREVO_LISTS_BY_PUBLISHER[params.publisherId];
  if (!lists) {
    return { ok: false, reason: "publisher_not_allowed" };
  }

  const result = await createOrUpdateContact({
    email: params.email,
    distinctId: params.distinctId,
    userScoringId: params.userScoringId,
    missionAlertEnabled: params.missionAlertEnabled ?? false,
    listIds: (params.signupSource && lists[params.signupSource]) ?? lists.default,
    signupSource: params.signupSource,
  });

  return result.ok ? { ok: true } : { ok: false, reason: "brevo_failed" };
};
