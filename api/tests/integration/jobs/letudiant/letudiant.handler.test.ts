import { randomBytes } from "node:crypto";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

import { PUBLISHER_IDS } from "@/config";
import { prisma } from "@/db/postgres";
import { ELIGIBLE_DOMAINS, QUOTA_BY_DOMAIN } from "@/jobs/letudiant/config";
import { LetudiantHandler } from "@/jobs/letudiant/handler";
import * as letudiantUtils from "@/jobs/letudiant/utils";
import { buildPilotyFetchMock, pilotyCompanyResponse, pilotyJobResponse, PILOTY_MANDATORY_DATA_MOCKS } from "../../../mocks";
import { createTestMission, createTestPublisher } from "../../../fixtures";

/**
 * L'Etudiant job integration tests
 *
 * The job has 3 phases:
 * 1. Archive expired/invalid/excluded missions (archiveExpiredMissions)
 * 2. Update missions modified since last sync (updateModifiedMissions)
 * 3. Publish new missions within domain quotas (publishNewMissions)
 *
 * Setup:
 * - Piloty API is mocked via global.fetch
 * - rateLimit is mocked to be instant
 * - countOnlineEntriesByDomain is spied on in quota-heavy tests
 */

// ─── Piloty mock helpers → see api/tests/mocks/pilotyMock.ts ────────────────

/** Returns a map with all eligible domains at 0 except the ones provided */
function makeOnlineCounts(overrides: Partial<Record<string, number>> = {}): Map<string, number> {
  const result = new Map<string, number>();
  for (const domain of ELIGIBLE_DOMAINS) {
    result.set(domain, overrides[domain] ?? 0);
  }
  return result;
}

// ─── DB helpers ─────────────────────────────────────────────────────────────

const originalFetch = global.fetch;

afterAll(() => {
  global.fetch = originalFetch;
});

beforeEach(async () => {
  await prisma.missionJobBoard.deleteMany({});
  await prisma.publisherDiffusionExclusion.deleteMany({});
});

/** Seed an ONLINE mission_jobboard entry. missionAddressId is null by default (no FK issue). */
async function seedOnlineEntry(missionId: string, publicId: string, options: { createdAt?: Date } = {}) {
  const { createdAt } = options;
  const entry = await prisma.missionJobBoard.create({
    data: { jobBoardId: "LETUDIANT", missionId, missionAddressId: null, publicId, syncStatus: "ONLINE" },
  });
  if (createdAt) {
    await prisma.$executeRaw`UPDATE "mission_jobboard" SET "created_at" = ${createdAt} WHERE "id" = ${entry.id}`;
  }
  return entry;
}

/**
 * Create a test mission with a fully wired organization chain.
 * syncMission requires mission.organizationId = publisherOrganization.organizationIdVerified,
 * so we create an Organization record and link it to the publisherOrganization.
 * letudiantPublicId is pre-set to avoid Piloty company creation calls in tests.
 */
async function createMissionWithOrg(publisherId: string, overrides: Record<string, any> = {}) {
  const mission = await createTestMission({
    publisherId,
    statusCode: "ACCEPTED",
    organizationName: "Test Org",
    ...overrides,
  });

  if (mission.publisherOrganizationId) {
    const org = await prisma.organization.create({
      data: { id: randomBytes(12).toString("hex"), title: "Test Org", letudiantPublicId: "company-existing" },
    });
    await prisma.publisherOrganization.update({
      where: { id: mission.publisherOrganizationId },
      data: { organizationIdVerified: org.id },
    });
    return { ...mission, organizationId: org.id };
  }

  return mission;
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe("LetudiantHandler (integration test)", () => {
  const handler = new LetudiantHandler();

  beforeEach(() => {
    vi.spyOn(letudiantUtils, "rateLimit").mockResolvedValue(undefined);
  });

  // ── Phase: archive expired missions ───────────────────────────────────────

  describe("Phase: archive expired missions", () => {
    it("archives a mission that has been ONLINE for more than 30 days", { timeout: 20000 }, async () => {
      const publisher = await createTestPublisher({ id: PUBLISHER_IDS.JEVEUXAIDER });
      const mission = await createTestMission({ publisherId: publisher.id, statusCode: "ACCEPTED", domain: "solidarite-insertion" });

      const thirtyOneDaysAgo = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000);
      await seedOnlineEntry(mission.id, "piloty-job-old", { createdAt: thirtyOneDaysAgo });

      global.fetch = buildPilotyFetchMock([pilotyJobResponse("piloty-job-old")]); // PATCH archive

      await handler.handle({});

      const updated = await prisma.missionJobBoard.findFirst({ where: { missionId: mission.id } });
      expect(updated?.syncStatus).toBe("OFFLINE");
    });

    it("archives a deleted mission", { timeout: 20000 }, async () => {
      const publisher = await createTestPublisher({ id: PUBLISHER_IDS.JEVEUXAIDER });
      const mission = await createTestMission({ publisherId: publisher.id, deleted: true, domain: "solidarite-insertion" });
      await seedOnlineEntry(mission.id, "piloty-job-deleted");

      global.fetch = buildPilotyFetchMock([pilotyJobResponse("piloty-job-deleted")]);

      await handler.handle({});

      const updated = await prisma.missionJobBoard.findFirst({ where: { missionId: mission.id } });
      expect(updated?.syncStatus).toBe("OFFLINE");
    });

    it("archives a mission with statusCode != ACCEPTED", { timeout: 20000 }, async () => {
      const publisher = await createTestPublisher({ id: PUBLISHER_IDS.JEVEUXAIDER });
      const mission = await createTestMission({ publisherId: publisher.id, statusCode: "REFUSED", domain: "solidarite-insertion" });
      await seedOnlineEntry(mission.id, "piloty-job-refused");

      global.fetch = buildPilotyFetchMock([pilotyJobResponse("piloty-job-refused")]);

      await handler.handle({});

      const updated = await prisma.missionJobBoard.findFirst({ where: { missionId: mission.id } });
      expect(updated?.syncStatus).toBe("OFFLINE");
    });

    it("archives a mission whose organization is excluded", { timeout: 20000 }, async () => {
      const publisher = await createTestPublisher({ id: PUBLISHER_IDS.JEVEUXAIDER });
      const letudiantPublisher = await createTestPublisher({ id: PUBLISHER_IDS.LETUDIANT });
      const orgClientId = "excluded-org-client-id";
      const mission = await createTestMission({
        publisherId: publisher.id,
        statusCode: "ACCEPTED",
        domain: "solidarite-insertion",
        organizationClientId: orgClientId,
      });
      await seedOnlineEntry(mission.id, "piloty-job-excluded");

      await prisma.publisherDiffusionExclusion.create({
        data: {
          excludedByAnnonceurId: publisher.id,
          excludedForDiffuseurId: letudiantPublisher.id,
          organizationClientId: orgClientId,
        },
      });

      global.fetch = buildPilotyFetchMock([pilotyJobResponse("piloty-job-excluded")]);

      await handler.handle({});

      const updated = await prisma.missionJobBoard.findFirst({ where: { missionId: mission.id } });
      expect(updated?.syncStatus).toBe("OFFLINE");
    });

    it("does NOT archive a mission ONLINE for less than 30 days that is still valid", { timeout: 20000 }, async () => {
      const publisher = await createTestPublisher({ id: PUBLISHER_IDS.JEVEUXAIDER });
      const mission = await createTestMission({ publisherId: publisher.id, statusCode: "ACCEPTED", domain: "solidarite-insertion" });
      await seedOnlineEntry(mission.id, "piloty-job-recent"); // created_at defaults to now

      global.fetch = buildPilotyFetchMock([]);

      await handler.handle({});

      const unchanged = await prisma.missionJobBoard.findFirst({ where: { missionId: mission.id } });
      expect(unchanged?.syncStatus).toBe("ONLINE");
    });

    it("marks OFFLINE when Piloty returns 404 on archive", { timeout: 20000 }, async () => {
      const publisher = await createTestPublisher({ id: PUBLISHER_IDS.JEVEUXAIDER });
      const mission = await createTestMission({ publisherId: publisher.id, deleted: true, domain: "solidarite-insertion" });
      await seedOnlineEntry(mission.id, "piloty-job-gone");

      global.fetch = vi.fn().mockImplementation((url: string, options: RequestInit = {}) => {
        const method = (options.method ?? "GET").toUpperCase();
        if (method === "PATCH") {
          return Promise.resolve({ ok: false, status: 404, json: async () => ({ message: "Not found" }) });
        }
        if (url.includes("/contracts")) {
          return Promise.resolve({ ok: true, json: async () => PILOTY_MANDATORY_DATA_MOCKS[0] });
        }
        if (url.includes("/remote_policies")) {
          return Promise.resolve({ ok: true, json: async () => PILOTY_MANDATORY_DATA_MOCKS[1] });
        }
        if (url.includes("/job_categories")) {
          return Promise.resolve({ ok: true, json: async () => PILOTY_MANDATORY_DATA_MOCKS[2] });
        }
        throw new Error(`Unexpected: ${method} ${url}`);
      });

      await handler.handle({});

      const updated = await prisma.missionJobBoard.findFirst({ where: { missionId: mission.id } });
      expect(updated?.syncStatus).toBe("OFFLINE");
    });
  });

  // ── Phase: update modified missions ───────────────────────────────────────

  describe("Phase: update modified missions", () => {
    it("calls updateJob for an ONLINE mission updated after last sync", { timeout: 20000 }, async () => {
      const publisher = await createTestPublisher({ id: PUBLISHER_IDS.JEVEUXAIDER });
      const mission = await createMissionWithOrg(publisher.id, { domain: "solidarite-insertion" });

      const entry = await seedOnlineEntry(mission.id, "piloty-job-to-update");
      // Set entry updatedAt in the past so mission.updatedAt > entry.updatedAt
      await prisma.$executeRaw`UPDATE "mission_jobboard" SET "updated_at" = ${new Date("2020-01-01")} WHERE "id" = ${entry.id}`;

      // Give org a letudiantPublicId to skip company creation
      if (mission.organizationId) {
        await prisma.organization.updateMany({ where: { id: mission.organizationId }, data: { letudiantPublicId: "company-existing" } });
      }

      global.fetch = buildPilotyFetchMock([pilotyJobResponse("piloty-job-to-update")]); // PATCH update

      await handler.handle({});

      const updatedEntry = await prisma.missionJobBoard.findFirst({ where: { missionId: mission.id } });
      expect(updatedEntry?.syncStatus).toBe("ONLINE");
      expect(updatedEntry?.publicId).toBe("piloty-job-to-update");
    });

    it("does NOT call updateJob when mission has not changed since last sync", { timeout: 20000 }, async () => {
      const publisher = await createTestPublisher({ id: PUBLISHER_IDS.JEVEUXAIDER });
      const mission = await createTestMission({ publisherId: publisher.id, statusCode: "ACCEPTED", domain: "solidarite-insertion" });
      const entry = await seedOnlineEntry(mission.id, "piloty-job-unchanged");

      // Set entry updatedAt AFTER mission.updatedAt
      const futureDate = new Date(Date.now() + 60 * 1000);
      await prisma.$executeRaw`UPDATE "mission_jobboard" SET "updated_at" = ${futureDate} WHERE "id" = ${entry.id}`;

      const fetchMock = buildPilotyFetchMock([]);
      global.fetch = fetchMock;

      await handler.handle({});

      const patchCalls = (fetchMock as any).mock.calls.filter(([, opts]: any) => (opts?.method ?? "GET").toUpperCase() === "PATCH");
      expect(patchCalls).toHaveLength(0);
    });

    it("does NOT reuse an OFFLINE id when updating a mission", { timeout: 20000 }, async () => {
      const publisher = await createTestPublisher({ id: PUBLISHER_IDS.JEVEUXAIDER });
      const mission = await createMissionWithOrg(publisher.id, { domain: "solidarite-insertion" });
      const missionAddress = await prisma.missionAddress.findFirst({ where: { missionId: mission.id } });

      await prisma.missionJobBoard.createMany({
        data: [
          {
            jobBoardId: "LETUDIANT",
            missionId: mission.id,
            missionAddressId: missionAddress?.id ?? null,
            publicId: "offline-job-id",
            syncStatus: "OFFLINE",
          },
          {
            jobBoardId: "LETUDIANT",
            missionId: mission.id,
            missionAddressId: null,
            publicId: "online-fallback-id",
            syncStatus: "ONLINE",
          },
        ],
      });

      await prisma.$executeRaw`UPDATE "mission_jobboard" SET "updated_at" = ${new Date("2020-01-01")} WHERE "mission_id" = ${mission.id}`;

      const fetchMock = buildPilotyFetchMock([pilotyJobResponse("updated-job-id")]);
      global.fetch = fetchMock;

      await handler.handle({});

      const patchCalls = (fetchMock as any).mock.calls.filter(
        ([, opts]: any) => (opts?.method ?? "GET").toUpperCase() === "PATCH"
      ) as Array<[string, RequestInit]>;

      expect(patchCalls).toHaveLength(1);
      expect(patchCalls[0][0]).toContain("/jobs/online-fallback-id");
      expect(patchCalls[0][0]).not.toContain("/jobs/offline-job-id");
    });
  });

  // ── Phase: publish new missions (quota management) ─────────────────────────

  describe("Phase: publish new missions — quota management", () => {
    it("publishes a new eligible mission and creates an ONLINE entry", { timeout: 20000 }, async () => {
      const publisher = await createTestPublisher({ id: PUBLISHER_IDS.JEVEUXAIDER });
      const mission = await createMissionWithOrg(publisher.id, { domain: "solidarite-insertion" });

      if (mission.organizationId) {
        await prisma.organization.updateMany({ where: { id: mission.organizationId }, data: { letudiantPublicId: "company-existing" } });
      }

      global.fetch = buildPilotyFetchMock([pilotyJobResponse("new-piloty-job-1")]); // POST create

      await handler.handle({});

      const created = await prisma.missionJobBoard.findFirst({ where: { missionId: mission.id } });
      expect(created?.syncStatus).toBe("ONLINE");
      expect(created?.publicId).toBe("new-piloty-job-1");
    });

    it("does NOT publish a mission from a non-eligible domain", { timeout: 20000 }, async () => {
      const publisher = await createTestPublisher({ id: PUBLISHER_IDS.JEVEUXAIDER });
      const mission = await createTestMission({ publisherId: publisher.id, statusCode: "ACCEPTED", domain: "environnement" });

      const fetchMock = buildPilotyFetchMock([]);
      global.fetch = fetchMock;

      await handler.handle({});

      const entry = await prisma.missionJobBoard.findFirst({ where: { missionId: mission.id } });
      expect(entry).toBeNull();
    });

    it("does NOT publish a mission from an excluded organization", { timeout: 20000 }, async () => {
      const publisher = await createTestPublisher({ id: PUBLISHER_IDS.JEVEUXAIDER });
      const letudiantPublisher = await createTestPublisher({ id: PUBLISHER_IDS.LETUDIANT });
      const orgClientId = "excluded-org-for-publish";
      const mission = await createTestMission({
        publisherId: publisher.id,
        statusCode: "ACCEPTED",
        domain: "solidarite-insertion",
        organizationClientId: orgClientId,
      });

      await prisma.publisherDiffusionExclusion.create({
        data: {
          excludedByAnnonceurId: publisher.id,
          excludedForDiffuseurId: letudiantPublisher.id,
          organizationClientId: orgClientId,
        },
      });

      const fetchMock = buildPilotyFetchMock([]);
      global.fetch = fetchMock;

      await handler.handle({});

      const entry = await prisma.missionJobBoard.findFirst({ where: { missionId: mission.id } });
      expect(entry).toBeNull();
    });

    it("does NOT publish a mission that already has an ERROR status", { timeout: 20000 }, async () => {
      const publisher = await createTestPublisher({ id: PUBLISHER_IDS.JEVEUXAIDER });
      const mission = await createTestMission({ publisherId: publisher.id, statusCode: "ACCEPTED", domain: "solidarite-insertion" });

      await prisma.missionJobBoard.create({
        data: { jobBoardId: "LETUDIANT", missionId: mission.id, missionAddressId: null, publicId: "", syncStatus: "ERROR" },
      });

      const fetchMock = buildPilotyFetchMock([]);
      global.fetch = fetchMock;

      await handler.handle({});

      const postCalls = (fetchMock as any).mock.calls.filter(([, opts]: any) => (opts?.method ?? "GET").toUpperCase() === "POST");
      expect(postCalls).toHaveLength(0);
    });

    it("respects domain quota: does not publish when domain is full", { timeout: 20000 }, async () => {
      const publisher = await createTestPublisher({ id: PUBLISHER_IDS.JEVEUXAIDER });

      // Mock countOnlineEntriesByDomain to return quota full for sport
      vi.spyOn(letudiantUtils, "countOnlineEntriesByDomain").mockResolvedValueOnce(
        makeOnlineCounts({ sport: QUOTA_BY_DOMAIN.sport }) // sport = 750 → 0 slots remaining
      );

      const candidate = await createMissionWithOrg(publisher.id, { domain: "sport" });
      if (candidate.organizationId) {
        await prisma.organization.updateMany({ where: { id: candidate.organizationId }, data: { letudiantPublicId: "company-existing" } });
      }

      const fetchMock = buildPilotyFetchMock([]);
      global.fetch = fetchMock;

      await handler.handle({});

      const entry = await prisma.missionJobBoard.findFirst({ where: { missionId: candidate.id } });
      expect(entry).toBeNull();
    });

    it("publishes within remaining slots when quota is partially filled", { timeout: 20000 }, async () => {
      const publisher = await createTestPublisher({ id: PUBLISHER_IDS.JEVEUXAIDER });

      // 2 slots remaining for benevolat-competences
      vi.spyOn(letudiantUtils, "countOnlineEntriesByDomain").mockResolvedValueOnce(
        makeOnlineCounts({ "benevolat-competences": QUOTA_BY_DOMAIN["benevolat-competences"] - 2 }) // 448 → 2 slots
      );

      const m1 = await createMissionWithOrg(publisher.id, { domain: "benevolat-competences" });
      const m2 = await createMissionWithOrg(publisher.id, { domain: "benevolat-competences" });
      const m3 = await createMissionWithOrg(publisher.id, { domain: "benevolat-competences" }); // should NOT be published

      const orgIds = [m1.organizationId, m2.organizationId, m3.organizationId].filter(Boolean) as string[];
      if (orgIds.length) {
        await prisma.organization.updateMany({ where: { id: { in: orgIds } }, data: { letudiantPublicId: "company-existing" } });
      }

      global.fetch = buildPilotyFetchMock([
        pilotyJobResponse("new-job-m3"),
        pilotyJobResponse("new-job-m2"),
        // m1 (oldest) has no slots — no POST expected
      ]);

      await handler.handle({});

      // ORDER BY created_at DESC → newest missions (m3, m2) fill the 2 slots; m1 (oldest) is skipped
      const e1 = await prisma.missionJobBoard.findFirst({ where: { missionId: m1.id } });
      const e2 = await prisma.missionJobBoard.findFirst({ where: { missionId: m2.id, syncStatus: "ONLINE" } });
      const e3 = await prisma.missionJobBoard.findFirst({ where: { missionId: m3.id, syncStatus: "ONLINE" } });
      expect(e1).toBeNull();
      expect(e2).not.toBeNull();
      expect(e3).not.toBeNull();
    });

    it("prioritizes newest missions (createdAt DESC) when filling quota", { timeout: 20000 }, async () => {
      const publisher = await createTestPublisher({ id: PUBLISHER_IDS.JEVEUXAIDER });

      // 1 slot remaining for sport
      vi.spyOn(letudiantUtils, "countOnlineEntriesByDomain").mockResolvedValueOnce(
        makeOnlineCounts({ sport: QUOTA_BY_DOMAIN.sport - 1 }) // 749 → 1 slot
      );

      const past = new Date("2024-01-01");
      const recent = new Date("2024-06-01");

      const oldMission = await createMissionWithOrg(publisher.id, { domain: "sport", createdAt: past });
      const newMission = await createMissionWithOrg(publisher.id, { domain: "sport", createdAt: recent });

      const orgIds = [oldMission.organizationId, newMission.organizationId].filter(Boolean) as string[];
      if (orgIds.length) {
        await prisma.organization.updateMany({ where: { id: { in: orgIds } }, data: { letudiantPublicId: "company-existing" } });
      }

      global.fetch = buildPilotyFetchMock([pilotyJobResponse("new-job-newest")]); // only 1 slot

      await handler.handle({});

      const newEntry = await prisma.missionJobBoard.findFirst({ where: { missionId: newMission.id } });
      const oldEntry = await prisma.missionJobBoard.findFirst({ where: { missionId: oldMission.id } });
      expect(newEntry?.syncStatus).toBe("ONLINE");
      expect(oldEntry).toBeNull();
    });

    it("publishes a mission with multiple addresses and consumes the correct number of slots", { timeout: 20000 }, async () => {
      const publisher = await createTestPublisher({ id: PUBLISHER_IDS.JEVEUXAIDER });

      // 3 slots remaining for solidarite-insertion
      vi.spyOn(letudiantUtils, "countOnlineEntriesByDomain").mockResolvedValueOnce(
        makeOnlineCounts({ "solidarite-insertion": QUOTA_BY_DOMAIN["solidarite-insertion"] - 3 }) // 1797 → 3 slots
      );

      // Mission with 3 distinct cities = 3 Piloty entries
      const mission = await createMissionWithOrg(publisher.id, {
        domain: "solidarite-insertion",
        addresses: [
          { city: "Paris", departmentName: "Île-de-France", country: "France" },
          { city: "Lyon", departmentName: "Auvergne-Rhône-Alpes", country: "France" },
          { city: "Marseille", departmentName: "Provence-Alpes-Côte d'Azur", country: "France" },
        ],
      });

      if (mission.organizationId) {
        await prisma.organization.updateMany({ where: { id: mission.organizationId }, data: { letudiantPublicId: "company-existing" } });
      }

      global.fetch = buildPilotyFetchMock([pilotyJobResponse("job-paris"), pilotyJobResponse("job-lyon"), pilotyJobResponse("job-marseille")]);

      await handler.handle({});

      const entries = await prisma.missionJobBoard.findMany({ where: { missionId: mission.id, syncStatus: "ONLINE" } });
      expect(entries).toHaveLength(3);
    });

    it("does NOT publish a multi-address mission when remaining quota is smaller than required slots", { timeout: 20000 }, async () => {
      const publisher = await createTestPublisher({ id: PUBLISHER_IDS.JEVEUXAIDER });

      vi.spyOn(letudiantUtils, "countOnlineEntriesByDomain").mockResolvedValueOnce(
        makeOnlineCounts({ "solidarite-insertion": QUOTA_BY_DOMAIN["solidarite-insertion"] - 1 })
      );

      const multiAddressMission = await createMissionWithOrg(publisher.id, {
        domain: "solidarite-insertion",
        addresses: [
          { city: "Paris", departmentName: "Île-de-France", country: "France" },
          { city: "Lyon", departmentName: "Auvergne-Rhône-Alpes", country: "France" },
          { city: "Marseille", departmentName: "Provence-Alpes-Côte d'Azur", country: "France" },
        ],
      });
      const singleAddressMission = await createMissionWithOrg(publisher.id, {
        domain: "solidarite-insertion",
        addresses: [{ city: "Nantes", departmentName: "Pays de la Loire", country: "France" }],
      });

      const orgIds = [multiAddressMission.organizationId, singleAddressMission.organizationId].filter(Boolean) as string[];
      if (orgIds.length) {
        await prisma.organization.updateMany({ where: { id: { in: orgIds } }, data: { letudiantPublicId: "company-existing" } });
      }

      global.fetch = buildPilotyFetchMock([pilotyJobResponse("single-address-job")]);

      await handler.handle({});

      const multiEntries = await prisma.missionJobBoard.findMany({ where: { missionId: multiAddressMission.id, syncStatus: "ONLINE" } });
      const singleEntries = await prisma.missionJobBoard.findMany({ where: { missionId: singleAddressMission.id, syncStatus: "ONLINE" } });
      expect(multiEntries).toHaveLength(0);
      expect(singleEntries).toHaveLength(1);
    });
  });

  // ── Domain isolation ───────────────────────────────────────────────────────

  describe("Domain isolation: quotas are independent per domain", () => {
    it("a full sport quota does not affect solidarite-insertion slots", { timeout: 20000 }, async () => {
      const publisher = await createTestPublisher({ id: PUBLISHER_IDS.JEVEUXAIDER });

      vi.spyOn(letudiantUtils, "countOnlineEntriesByDomain").mockResolvedValueOnce(
        makeOnlineCounts({
          sport: QUOTA_BY_DOMAIN.sport, // sport full
          "solidarite-insertion": 0, // solidarite-insertion empty
          "benevolat-competences": 0,
        })
      );

      const solidariteMission = await createMissionWithOrg(publisher.id, { domain: "solidarite-insertion" });
      if (solidariteMission.organizationId) {
        await prisma.organization.updateMany({ where: { id: solidariteMission.organizationId }, data: { letudiantPublicId: "company-existing" } });
      }

      global.fetch = buildPilotyFetchMock([pilotyJobResponse("new-solidarite-job")]);

      await handler.handle({});

      const entry = await prisma.missionJobBoard.findFirst({ where: { missionId: solidariteMission.id, syncStatus: "ONLINE" } });
      expect(entry).not.toBeNull();
    });
  });

  // ── Cross-cutting scenario ─────────────────────────────────────────────────

  describe("Cross-cutting: archive frees slots for new missions", () => {
    it("archives an expired entry and then publishes a candidate mission in the freed slot", { timeout: 20000 }, async () => {
      const publisher = await createTestPublisher({ id: PUBLISHER_IDS.JEVEUXAIDER });

      // Old ONLINE mission for benevolat-competences — will be archived in phase 1
      const oldMission = await createTestMission({ publisherId: publisher.id, statusCode: "ACCEPTED", domain: "benevolat-competences" });
      const thirtyOneDaysAgo = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000);
      await seedOnlineEntry(oldMission.id, "old-piloty-job", { createdAt: thirtyOneDaysAgo });

      // Candidate mission — should be published after old entry is archived
      const candidate = await createMissionWithOrg(publisher.id, { domain: "benevolat-competences" });
      if (candidate.organizationId) {
        await prisma.organization.updateMany({ where: { id: candidate.organizationId }, data: { letudiantPublicId: "company-existing" } });
      }

      // Mock: PATCH archive (phase 1) + POST create (phase 3)
      // countOnlineEntriesByDomain is NOT mocked — it reads from DB
      // After phase 1 archives the old entry (OFFLINE), count = 0 → 450 slots available
      global.fetch = buildPilotyFetchMock([
        pilotyJobResponse("old-piloty-job"), // PATCH archive
        pilotyJobResponse("new-candidate-job"), // POST create
      ]);

      await handler.handle({});

      const oldEntry = await prisma.missionJobBoard.findFirst({ where: { missionId: oldMission.id } });
      const candidateEntry = await prisma.missionJobBoard.findFirst({ where: { missionId: candidate.id } });
      expect(oldEntry?.syncStatus).toBe("OFFLINE");
      expect(candidateEntry?.syncStatus).toBe("ONLINE");
    });
  });
});
