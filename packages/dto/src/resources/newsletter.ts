// Point d'entrée de la première inscription d'un contact, conservé dans Brevo (attribut SIGNUP_SOURCE).
export const SIGNUP_SOURCES = [
  "quiz",
  "result_list",
  "save_mission",
  "mission_detail",
  "landing_page_reengagement_police_nationale",
  "home_newsletter",
  "missions_newsletter",
  "cms_newsletter",
  "chacun_pour_tous_newsletter",
  "landing_accompagnateurs",
] as const;

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
