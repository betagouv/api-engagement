// Source d'inscription d'une page du CMS : `cms_` suivi de son slug, « - » et « / » remplacés par « _ » (80 caractères au plus, comme le slug).
export const CMS_SIGNUP_SOURCE_PATTERN = /^cms_[a-z0-9_]{1,80}$/;

// Listes alimentées, au choix d'une page du CMS. Seuls ces noms circulent : les ids Brevo restent dans l'API.
export const NEWSLETTER_LIST_CHOICES = ["newsletter", "newsletter_et_recommandations"] as const;
