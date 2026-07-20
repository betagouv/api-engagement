import { useEffect, useState } from "react";
import { disableInternalUserFlag } from "~/services/tracking";
import { isInternalUserFlagEnabled } from "~/utils/internal-user-flag";

export default function InternalUserFlagIndicator() {
  const [visible, setVisible] = useState(false);
  const [helpHidden, setHelpHidden] = useState(false);

  useEffect(() => {
    try {
      setVisible(isInternalUserFlagEnabled(window.location.search, window.localStorage));
    } catch {
      setVisible(isInternalUserFlagEnabled(window.location.search, { getItem: () => null }));
    }
  }, []);

  // RGAA 10.13 : le panneau d'aide affiché au survol/focus doit pouvoir être masqué à la touche Échap.
  useEffect(() => {
    if (!visible) return;
    const hideHelpOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setHelpHidden(true);
    };
    document.addEventListener("keydown", hideHelpOnEscape);
    return () => document.removeEventListener("keydown", hideHelpOnEscape);
  }, [visible]);

  function handleReactivateTracking() {
    disableInternalUserFlag();
    const url = new URL(window.location.href);
    url.searchParams.delete("internal");
    window.history.replaceState(window.history.state, "", url);
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="group fixed bottom-3 left-3 z-[2000] flex items-end gap-2" onMouseLeave={() => setHelpHidden(false)} onBlur={() => setHelpHidden(false)}>
      <button
        type="button"
        className="flex size-11 items-center justify-center rounded-full bg-title-grey text-background shadow-card"
        aria-label="Navigation interne exclue des statistiques"
        aria-describedby="internal-user-flag-help"
      >
        <span className="fr-icon-eye-off-line fr-icon--sm" aria-hidden="true" />
      </button>
      <div
        id="internal-user-flag-help"
        className={`pointer-events-none mb-0 hidden w-72 rounded-md border border-border-default-grey bg-background p-3 text-title-grey shadow-card ${helpHidden ? "" : "group-hover:block group-focus-within:block"}`}
      >
        <p className="fr-text--sm mb-2!">
          Mode interne actif : les prochains événements de ce navigateur sont marqués <strong>internal_user</strong> et peuvent être exclus des statistiques.
        </p>
        <button type="button" className="fr-btn fr-btn--sm fr-btn--secondary pointer-events-auto w-full! justify-center!" onClick={handleReactivateTracking}>
          Réactiver le tracking
        </button>
      </div>
    </div>
  );
}
