import { vi } from "vitest";

/**
 * Données retournées par les GET initiaux de l'API Piloty (chargés une fois au démarrage du job).
 * [0] = GET /contracts
 * [1] = GET /remote_policies
 * [2] = GET /job_categories
 */
export const PILOTY_MANDATORY_DATA_MOCKS = [
  {
    data: [
      { id: "c-benevolat", ref: "volunteering", name: "Volunteering" },
      { id: "c-volontariat", ref: "civil_service", name: "Civil Service" },
    ],
  },
  { data: [{ id: "rp-full", ref: "fulltime", name: "Full Remote" }] },
  {
    data: [
      { id: "jc-env", ref: "environment_energie", name: "Env", children: { data: [] } },
      { id: "jc-solidarite", ref: "customer_service_customer_advisor", name: "Solidarité", children: { data: [] } },
      { id: "jc-sante", ref: "health_social", name: "Santé", children: { data: [] } },
      { id: "jc-culture", ref: "tourism_leisure", name: "Culture", children: { data: [] } },
      { id: "jc-education", ref: "education_training", name: "Education", children: { data: [] } },
      { id: "jc-emploi", ref: "hr", name: "Emploi", children: { data: [] } },
      { id: "jc-sport", ref: "arts_culture_sport", name: "Sport", children: { data: [] } },
      { id: "jc-humanitaire", ref: "hr_mobility", name: "Humanitaire", children: { data: [] } },
      { id: "jc-animaux", ref: "health_social_pet_sitting", name: "Animaux", children: { data: [] } },
      { id: "jc-autre", ref: "customer_support", name: "Autre", children: { data: [] } },
    ],
  },
];

export type FetchMockResponse = { data: any } | any;

/**
 * Construit un mock de `global.fetch` pour l'API Piloty.
 * - Les GET /contracts, /remote_policies, /job_categories retournent les données obligatoires
 * - Les autres appels (POST /jobs, PATCH /jobs/:id, etc.) consomment la file `additionalResponses`
 * - Lève une erreur si un appel non prévu est reçu
 */
export function buildPilotyFetchMock(additionalResponses: FetchMockResponse[] = []) {
  const queue = [...additionalResponses];
  return vi.fn().mockImplementation((url: string, options: RequestInit = {}) => {
    const method = (options.method ?? "GET").toUpperCase();

    if (method === "GET" && url.includes("/contracts")) {
      return Promise.resolve({ ok: true, json: async () => PILOTY_MANDATORY_DATA_MOCKS[0] });
    }
    if (method === "GET" && url.includes("/remote_policies")) {
      return Promise.resolve({ ok: true, json: async () => PILOTY_MANDATORY_DATA_MOCKS[1] });
    }
    if (method === "GET" && url.includes("/job_categories")) {
      return Promise.resolve({ ok: true, json: async () => PILOTY_MANDATORY_DATA_MOCKS[2] });
    }

    const next = queue.shift();
    if (next === undefined) {
      throw new Error(`[Test] Unexpected fetch call: ${method} ${url}. No more mocked responses.`);
    }
    return Promise.resolve({ ok: true, json: async () => next });
  });
}

/** Réponse Piloty simulée pour un POST /jobs ou PATCH /jobs/:id */
export function pilotyJobResponse(publicId: string) {
  return { data: [{ public_id: publicId, name: "Test Job" }] };
}

/** Réponse Piloty simulée pour un POST /companies ou GET /companies/:id */
export function pilotyCompanyResponse(publicId: string) {
  return { data: { public_id: publicId, name: "Test Company" } };
}
