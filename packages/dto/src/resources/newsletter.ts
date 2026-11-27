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

// Page du CMS : `cms_` suivi de son slug, « - » et « / » remplacés par « _ » (80 caractères au plus, comme le slug).
export const CMS_SIGNUP_SOURCE_PATTERN = /^cms_[a-z0-9_]{1,80}$/;

// Sources acceptées par l'inscription à la newsletter : la liste ci-dessus, ou la page du CMS d'où elle part.
export type NewsletterSignupSource = SignupSource | `cms_${string}`;

// Listes alimentées, au choix d'une page du CMS. Seuls ces noms circulent : les ids Brevo restent dans l'API.
export const NEWSLETTER_LIST_CHOICES = ["newsletter", "newsletter_et_recommandations"] as const;

export type NewsletterListChoice = (typeof NEWSLETTER_LIST_CHOICES)[number];

export type NewsletterSubscribeRequest = {
  email: string;
  distinctId?: string;
  userScoringId?: string;
  signupSource?: NewsletterSignupSource;
  // Prioritaire sur les listes associées à la source.
  newsletterLists?: NewsletterListChoice;
};

export type NewsletterSubscribeResponse = {
  subscribed: boolean;
};
