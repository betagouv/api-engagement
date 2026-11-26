// Bandeau « version bêta » : la fermeture est mémorisée 30 jours dans un cookie. Le serveur le lit pour rendre
// la page directement avec ou sans bandeau : affiché seulement après l'hydratation, il décalerait toute la page (CLS).
// La mémorisation est propre à chaque source (quiz / résultats / site) : les bandeaux n'ont pas
// le même message, fermer celui du site ou du quiz ne doit pas masquer celui des résultats.

export type BetaBannerSource = "quiz" | "results" | "site";

export const BETA_BANNER_SOURCES: BetaBannerSource[] = ["quiz", "results", "site"];

const DISMISS_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

export function betaBannerCookieName(source: BetaBannerSource): string {
  return `plateform_beta_banner_dismissed_${source}`;
}

export function isBetaBannerDismissed(source: BetaBannerSource, cookieHeader: string): boolean {
  const prefix = `${betaBannerCookieName(source)}=`;
  return cookieHeader.split(";").some((part) => part.trim().startsWith(prefix));
}

export function betaBannerDismissCookie(source: BetaBannerSource, secure: boolean): string {
  return `${betaBannerCookieName(source)}=1; Path=/; Max-Age=${DISMISS_MAX_AGE_SECONDS}; SameSite=Lax${secure ? "; Secure" : ""}`;
}
