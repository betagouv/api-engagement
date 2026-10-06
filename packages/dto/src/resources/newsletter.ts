// Point d'entrée de la première inscription d'un contact, conservé dans Brevo (attribut SIGNUP_SOURCE).
export const SIGNUP_SOURCES = ["quiz", "result_list", "save_mission"] as const;

export type SignupSource = (typeof SIGNUP_SOURCES)[number];

export type NewsletterSubscribeRequest = {
  email: string;
  distinctId?: string;
  userScoringId?: string;
  signupSource?: SignupSource;
};

export type NewsletterSubscribeResponse = {
  subscribed: boolean;
};
