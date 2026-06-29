import { SourceReader } from "../process-definition";
import { createPosthogEventReader } from "./posthog";

/**
 * Couche d'abstraction « tracking » : le reste du code (jobs, config, tables)
 * ignore le provider concret. Pour changer de fournisseur d'évènements front,
 * il suffit d'ajouter un provider dans ce dossier et de l'enregistrer ci-dessous
 * — aucune autre partie du code n'a à être modifiée.
 *
 * Le provider courant est sélectionné via `TRACKING_PROVIDER` (défaut : "posthog").
 */
const DEFAULT_PROVIDER = "posthog";

type TrackingProvider = "posthog";

const readerFactories: Record<TrackingProvider, () => SourceReader> = {
  posthog: createPosthogEventReader,
};

const resolveProvider = (): TrackingProvider => {
  const provider = (process.env.TRACKING_PROVIDER || DEFAULT_PROVIDER).toLowerCase();
  if (!(provider in readerFactories)) {
    throw new Error(`Unsupported TRACKING_PROVIDER '${provider}' (supported: ${Object.keys(readerFactories).join(", ")})`);
  }
  return provider as TrackingProvider;
};

/**
 * Construit le `SourceReader` d'évènements de tracking pour le provider configuré.
 */
export const createTrackingEventReader = (): SourceReader => {
  return readerFactories[resolveProvider()]();
};
