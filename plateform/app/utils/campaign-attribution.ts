// Attribution de campagne (UTM) attachée à tous les évènements de tracking.
// Modèle : "last non-direct touch" + session glissante de 30 min.
//   - Une nouvelle campagne (UTM dans l'URL) écrase l'attribution stockée.
//   - Le trafic direct / la navigation interne (aucun UTM) n'écrase pas : l'attribution persiste.
//   - Passé 30 min sans activité, l'attribution est purgée (retour direct = trafic direct).
// Fonctions pures (storage et now injectés) pour rester testables sans `window`.

export const CAMPAIGN_ATTRIBUTION_STORAGE_KEY = "plateform.campaign_attribution";

// Fenêtre glissante d'inactivité au-delà de laquelle l'attribution expire (équivalent GA).
export const CAMPAIGN_SESSION_TTL_MS = 30 * 60 * 1000;

export const CAMPAIGN_UTM_KEYS = ["utm_source", "utm_campaign", "utm_medium"] as const;

export type CampaignUtmKey = (typeof CAMPAIGN_UTM_KEYS)[number];

// UTM présents pour une attribution donnée (sous-ensemble possible des 3 clés).
export type CampaignParams = Partial<Record<CampaignUtmKey, string>>;

// Forme persistée : les UTM + le timestamp de dernière activité (pour le TTL glissant).
interface StoredCampaign {
  params: CampaignParams;
  ts: number;
}

// Extrait les UTM présents et non vides de l'URL. Accepte une querystring ou une URLSearchParams.
export function getCampaignParamsFromSearch(search: string | URLSearchParams): CampaignParams {
  const params = typeof search === "string" ? new URLSearchParams(search) : search;

  const result: CampaignParams = {};
  for (const key of CAMPAIGN_UTM_KEYS) {
    const value = params.get(key);
    if (value) result[key] = value;
  }
  return result;
}

function hasParams(params: CampaignParams): boolean {
  return Object.keys(params).length > 0;
}

// Lecture défensive : retourne null si absent ou JSON invalide.
function readStored(storage: Pick<Storage, "getItem">): StoredCampaign | null {
  const raw = storage.getItem(CAMPAIGN_ATTRIBUTION_STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as StoredCampaign;
    if (!parsed || typeof parsed.ts !== "number" || typeof parsed.params !== "object") return null;
    return parsed;
  } catch {
    return null;
  }
}

// Résout l'attribution active et met à jour le storage (écrasement / prolongation / purge).
// Retourne les UTM à enregistrer comme super properties ({} si aucune attribution active).
export function resolveActiveCampaign(search: string | URLSearchParams, storage: Pick<Storage, "getItem" | "setItem" | "removeItem">, now: number = Date.now()): CampaignParams {
  const fromUrl = getCampaignParamsFromSearch(search);

  // Nouvelle campagne : écrase l'attribution précédente (last non-direct touch).
  if (hasParams(fromUrl)) {
    storage.setItem(CAMPAIGN_ATTRIBUTION_STORAGE_KEY, JSON.stringify({ params: fromUrl, ts: now }));
    return fromUrl;
  }

  // Trafic direct / navigation interne : on prolonge la session tant qu'elle n'a pas expiré.
  const stored = readStored(storage);
  if (stored && now - stored.ts <= CAMPAIGN_SESSION_TTL_MS) {
    storage.setItem(CAMPAIGN_ATTRIBUTION_STORAGE_KEY, JSON.stringify({ params: stored.params, ts: now }));
    return stored.params;
  }

  // Session expirée ou absente : purge et pas d'attribution.
  if (stored) storage.removeItem(CAMPAIGN_ATTRIBUTION_STORAGE_KEY);
  return {};
}
