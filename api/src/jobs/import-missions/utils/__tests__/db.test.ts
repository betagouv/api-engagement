import { describe, expect, it, vi } from "vitest";

// db.ts importe des services lourds (Prisma, providers IA) inutiles ici : on les neutralise
// pour tester uniquement la logique de gating. Le module prompts (ENRICHMENT_TRIGGER_FIELDS)
// reste réel : c'est la source de vérité qu'on veut valider.
vi.mock("@/services/mission", () => ({ missionService: {} }));
vi.mock("@/services/mission-event", () => ({ missionEventService: {} }));
vi.mock("@/services/publisher-organization", () => ({ default: {} }));
vi.mock("../../../../error", () => ({ captureException: vi.fn() }));

import { changesRequireEnrichment, orgChangesRequireEnrichment } from "@/jobs/import-missions/utils/db";
import { ENRICHMENT_TRIGGER_FIELDS, ORG_ENRICHMENT_TRIGGER_FIELDS } from "@/services/mission-enrichment/prompts";
import { IMPORT_FIELDS_TO_COMPARE } from "@/utils/mission";
import { IMPORT_FIELDS_TO_COMPARE as ORG_IMPORT_FIELDS_TO_COMPARE } from "@/utils/publisher-organization";

const change = (previous: unknown, current: unknown) => ({ previous, current });

describe("changesRequireEnrichment", () => {
  it("ne déclenche pas pour les changements hors-prompt (compteurs, localisation, champs dérivés)", () => {
    expect(changesRequireEnrichment({ places: change(5, 4) })).toBe(false);
    expect(changesRequireEnrichment({ snuPlaces: change(5, 4) })).toBe(false);
    expect(changesRequireEnrichment({ addresses: change([], []) })).toBe(false);
    expect(changesRequireEnrichment({ descriptionHtml: change("a", "b") })).toBe(false);
    expect(changesRequireEnrichment({ domainLogo: change("a", "b") })).toBe(false);
  });

  it("ne déclenche pas pour les dates glissantes et la durée dérivée", () => {
    expect(changesRequireEnrichment({ startAt: change("d1", "d2"), postedAt: change("d1", "d2") })).toBe(false);
    expect(changesRequireEnrichment({ duration: change(3, 4), endAt: change("d1", "d2") })).toBe(false);
  });

  it("déclenche dès qu'un champ consommé par le prompt change", () => {
    expect(changesRequireEnrichment({ title: change("a", "b") })).toBe(true);
    expect(changesRequireEnrichment({ description: change("a", "b") })).toBe(true);
    expect(changesRequireEnrichment({ requirements: change([], ["x"]) })).toBe(true);
    expect(changesRequireEnrichment({ publisherOrganizationId: change("a", "b") })).toBe(true);
  });

  it("déclenche quand un champ pertinent est mêlé à du bruit", () => {
    expect(changesRequireEnrichment({ places: change(5, 4), tags: change([], ["x"]) })).toBe(true);
  });

  it("déclenche sur changement de deletedAt (restauration/suppression)", () => {
    expect(changesRequireEnrichment({ deletedAt: change(new Date(), null) })).toBe(true);
  });

  it("ne déclenche pas pour un diff vide", () => {
    expect(changesRequireEnrichment({})).toBe(false);
  });
});

describe("orgChangesRequireEnrichment", () => {
  it("déclenche quand un champ d'org consommé par le prompt change", () => {
    expect(orgChangesRequireEnrichment({ name: change("a", "b") })).toBe(true);
    expect(orgChangesRequireEnrichment({ description: change("a", "b") })).toBe(true);
    expect(orgChangesRequireEnrichment({ actions: change([], ["x"]) })).toBe(true);
    expect(orgChangesRequireEnrichment({ beneficiaries: change([], ["x"]) })).toBe(true);
  });

  it("ne déclenche pas pour les champs d'org hors-prompt", () => {
    expect(orgChangesRequireEnrichment({ rna: change("a", "b") })).toBe(false);
    expect(orgChangesRequireEnrichment({ siren: change("a", "b") })).toBe(false);
    expect(orgChangesRequireEnrichment({ url: change("a", "b") })).toBe(false);
    expect(orgChangesRequireEnrichment({ logo: change("a", "b") })).toBe(false);
    expect(orgChangesRequireEnrichment({ city: change("a", "b"), postalCode: change("a", "b") })).toBe(false);
  });

  it("déclenche quand un champ pertinent est mêlé à du bruit d'org", () => {
    expect(orgChangesRequireEnrichment({ city: change("a", "b"), description: change("a", "b") })).toBe(true);
  });
});

describe("ENRICHMENT_TRIGGER_FIELDS", () => {
  it("reste un sous-ensemble des champs comparés à l'import", () => {
    const comparable = new Set<string>(IMPORT_FIELDS_TO_COMPARE as unknown as string[]);
    for (const field of ENRICHMENT_TRIGGER_FIELDS) {
      expect(comparable.has(field)).toBe(true);
    }
  });
});

describe("ORG_ENRICHMENT_TRIGGER_FIELDS", () => {
  it("reste un sous-ensemble des champs d'org comparés à l'import", () => {
    const comparable = new Set<string>(ORG_IMPORT_FIELDS_TO_COMPARE as unknown as string[]);
    for (const field of ORG_ENRICHMENT_TRIGGER_FIELDS) {
      expect(comparable.has(field)).toBe(true);
    }
  });
});
