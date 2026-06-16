// Contrats du service de tracking, volontairement agnostiques de l'outil sous-jacent
// (PostHog, Umami, Plausible, Matomo, ...). Un provider concret implémente `TrackingProvider`.

// Propriétés associées à un évènement. On reste large pour ne pas contraindre les providers,
// mais on évite d'y mettre des données personnelles (cf. règles de sécurité du dépôt).
export type TrackingProperties = Record<string, string | number | boolean | null | undefined>;

// Identité optionnelle de l'utilisateur courant. `distinctId` correspond à l'id anonyme déjà
// utilisé par le quiz (`useQuizStore.distinctId`).
export type TrackingTraits = Record<string, string | number | boolean | null | undefined>;

// Interface qu'un provider doit implémenter. `identify` et `init` sont optionnels :
// tous les outils ne les supportent pas (ex. Plausible n'a pas d'identification).
export interface TrackingProvider {
  // Nom lisible du provider, utile pour le debug.
  readonly name: string;
  // Initialisation côté navigateur (chargement du SDK, configuration). Idempotent.
  init?(): void | Promise<void>;
  // Enregistre un évènement avec ses propriétés.
  track(event: string, properties?: TrackingProperties): void;
  // Associe l'utilisateur courant à un identifiant et, éventuellement, des traits.
  identify?(distinctId: string, traits?: TrackingTraits): void;
}

// Liste des providers supportés. Pour l'instant seul `local` est implémenté ; les autres
// servent de cibles connues pour le choix d'outil (VITE_TRACKING_PROVIDER).
export type TrackingProviderName = "local" | "posthog" | "umami" | "plausible" | "matomo";
