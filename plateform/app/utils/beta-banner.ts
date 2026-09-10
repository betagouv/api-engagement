// Bandeau « version bêta » : la fermeture est mémorisée 30 jours dans le localStorage.
// La mémorisation est propre à chaque source (quiz / résultats) : les deux bandeaux ne posent
// pas les mêmes questions, fermer celui du quiz ne doit pas masquer celui des résultats.
// Fonctions pures (storage et now injectés) pour rester testables sans `window`.

export type BetaBannerSource = "quiz" | "results";

export const BETA_BANNER_DISMISS_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export function betaBannerStorageKey(source: BetaBannerSource): string {
  return `plateform.beta_banner_dismissed.${source}`;
}

// Lecture défensive : une valeur absente ou illisible réaffiche le bandeau. Passé le TTL, la
// clé est purgée pour ne pas laisser traîner une fermeture expirée.
export function isBetaBannerDismissed(source: BetaBannerSource, storage: Pick<Storage, "getItem" | "removeItem">, now: number = Date.now()): boolean {
  const raw = storage.getItem(betaBannerStorageKey(source));
  if (!raw) return false;

  const dismissedAt = Number(raw);
  if (Number.isNaN(dismissedAt) || now - dismissedAt > BETA_BANNER_DISMISS_TTL_MS) {
    storage.removeItem(betaBannerStorageKey(source));
    return false;
  }

  return true;
}

export function dismissBetaBanner(source: BetaBannerSource, storage: Pick<Storage, "setItem">, now: number = Date.now()): void {
  storage.setItem(betaBannerStorageKey(source), String(now));
}
