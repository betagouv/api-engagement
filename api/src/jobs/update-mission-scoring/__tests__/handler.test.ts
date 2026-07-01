import { describe, expect, it } from "vitest";

import { selectActiveEnrichments } from "@/jobs/update-mission-scoring/handler";

describe("selectActiveEnrichments", () => {
  it("conserve uniquement le premier enrichissement par mission dans l'ordre reçu", () => {
    const enrichments = [
      { id: "enrichment-new-mission-1", missionId: "mission-1" },
      { id: "enrichment-new-mission-2", missionId: "mission-2" },
      { id: "enrichment-old-mission-1", missionId: "mission-1" },
      { id: "enrichment-old-mission-2", missionId: "mission-2" },
    ];

    expect(selectActiveEnrichments(enrichments)).toEqual([
      { id: "enrichment-new-mission-1", missionId: "mission-1" },
      { id: "enrichment-new-mission-2", missionId: "mission-2" },
    ]);
  });

  it("applique la limite après sélection des missions distinctes", () => {
    const enrichments = [
      { id: "enrichment-new-mission-1", missionId: "mission-1" },
      { id: "enrichment-old-mission-1", missionId: "mission-1" },
      { id: "enrichment-new-mission-2", missionId: "mission-2" },
    ];

    expect(selectActiveEnrichments(enrichments, 2)).toEqual([
      { id: "enrichment-new-mission-1", missionId: "mission-1" },
      { id: "enrichment-new-mission-2", missionId: "mission-2" },
    ]);
  });
});
