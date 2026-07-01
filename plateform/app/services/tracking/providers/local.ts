/* eslint-disable no-console -- ce provider a justement pour rôle de logger les évènements en console */
import type { TrackingProvider, TrackingProperties, TrackingTraits } from "../types";

// Provider de développement : n'envoie rien à un service externe, se contente de logger
// les évènements dans la console. Sert de défaut tant qu'aucun outil n'est branché et reste
// utile en local pour vérifier ce qui serait tracké.
export function createLocalProvider(): TrackingProvider {
  return {
    name: "local",

    init() {
      console.info("[tracking] provider local actif (console.log uniquement)");
    },

    track(event: string, properties?: TrackingProperties) {
      console.log(`[tracking] track "${event}"`, properties ?? {});
    },

    identify(distinctId: string, traits?: TrackingTraits) {
      console.log(`[tracking] identify "${distinctId}"`, traits ?? {});
    },

    register(properties: TrackingProperties) {
      console.log("[tracking] register super properties", properties);
    },
  };
}
