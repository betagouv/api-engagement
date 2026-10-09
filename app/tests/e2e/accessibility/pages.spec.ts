import { expect, test } from "@playwright/test";

import { MOCK_PUBLISHER, MOCK_USER, PUBLISHER_ID, assertNotLoggedOut, setupUserMocks } from "../dashboard/fixtures";
import { expectNoRgaaViolation } from "./axe";

const MISSION_ID = "mission-test";

const MOCK_MISSION = {
  _id: MISSION_ID,
  title: "Distribution de repas",
  description: "Première ligne.\nSeconde ligne.",
  organizationName: "Association Test",
  organizationUrl: "https://example.org",
  publisherName: "Test Publisher",
  lastSyncAt: "2026-01-01T10:00:00.000Z",
  applicationUrl: "https://example.org/mission",
  domain: "solidarite-insertion",
  domainLogo: "data:image/gif;base64,R0lGODlhAQABAAAAACw=",
  country: "FR",
  city: "Paris",
  departmentName: "Paris",
  addresses: [],
  activities: ["Aide alimentaire"],
  softSkills: ["Écoute"],
  startAt: "2026-02-01T00:00:00.000Z",
  endAt: null,
  adminEnrichment: null,
  adminScoring: null,
};

const missionRoutes = (role: "user" | "admin") => [
  { method: "GET", path: "/user/refresh", response: { ok: true, data: { user: { ...MOCK_USER, role }, publisher: MOCK_PUBLISHER, token: "mock-token-refreshed" } } },
  { method: "GET", path: "/warning/admin-state", response: { ok: true, data: { up: true, upToDate: true, last: null } } },
  { method: "GET", path: `/mission/${MISSION_ID}`, response: { ok: true, data: MOCK_MISSION } },
];

test.describe("Accessibilité RGAA", { tag: "@a11y" }, () => {
  test("Connexion", async ({ page }, testInfo) => {
    await page.goto("/login");
    await expect(page.getByRole("heading", { level: 1, name: "Connexion" })).toBeVisible();

    await expectNoRgaaViolation(page, testInfo);
  });

  test("Connexion — erreurs de validation", async ({ page }, testInfo) => {
    await page.goto("/login");
    await page.getByRole("button", { name: "Se connecter" }).click();
    await expect(page.getByText("Le mot de passe est requis.")).toBeVisible();

    await expectNoRgaaViolation(page, testInfo);
  });

  test("Conditions générales d’utilisation", async ({ page }, testInfo) => {
    await page.goto("/cgu");
    await expect(page.getByRole("main")).toBeVisible();

    await expectNoRgaaViolation(page, testInfo);
  });

  test("Compte utilisateur", async ({ page }, testInfo) => {
    await setupUserMocks(page);
    await page.goto(`/${PUBLISHER_ID}/my-account`);
    await assertNotLoggedOut(page);

    await expectNoRgaaViolation(page, testInfo);
  });

  test("Performance", async ({ page }, testInfo) => {
    await setupUserMocks(page, [
      { method: "POST", path: "/mission/search", response: { ok: true, data: [], total: 0, aggs: {} } },
      { method: "POST", path: "/campaign/search", response: { ok: true, data: [], total: 0 } },
      { method: "POST", path: "/widget/search", response: { ok: true, data: [], total: 0 } },
      { method: "POST", path: "/metabase/card/", response: { ok: true, data: { data: { rows: [], cols: [] } } } },
    ]);
    await page.goto(`/${PUBLISHER_ID}/performance`);
    await assertNotLoggedOut(page);

    await expectNoRgaaViolation(page, testInfo);
  });

  test("Diffusion — widgets", async ({ page }, testInfo) => {
    await setupUserMocks(page, [{ method: "POST", path: "/widget/search", response: { ok: true, data: [], total: 0 } }]);
    await page.goto(`/${PUBLISHER_ID}/broadcast`);
    await assertNotLoggedOut(page);

    await expectNoRgaaViolation(page, testInfo);
  });

  test("Paramètres — flux", async ({ page }, testInfo) => {
    await setupUserMocks(page, [{ method: "POST", path: "/import/search", response: { ok: true, data: [], total: 0 } }]);
    await page.goto(`/${PUBLISHER_ID}/settings`);
    await assertNotLoggedOut(page);

    await expectNoRgaaViolation(page, testInfo);
  });

  test("Mission — détails", async ({ page }, testInfo) => {
    await setupUserMocks(page, missionRoutes("user"));
    await page.goto(`/${PUBLISHER_ID}/mission/${MISSION_ID}`);
    await expect(page.getByRole("heading", { level: 1, name: MOCK_MISSION.title })).toBeVisible();
    await assertNotLoggedOut(page);

    await expectNoRgaaViolation(page, testInfo);
  });

  test("Mission — détails (admin)", async ({ page }, testInfo) => {
    await setupUserMocks(page, missionRoutes("admin"));
    await page.goto(`/${PUBLISHER_ID}/mission/${MISSION_ID}`);
    await expect(page.getByRole("button", { name: "Modifier la mission" })).toBeVisible();
    await assertNotLoggedOut(page);

    await expectNoRgaaViolation(page, testInfo);
  });

  test("Mission — édition (admin)", async ({ page }, testInfo) => {
    await setupUserMocks(page, missionRoutes("admin"));
    await page.goto(`/${PUBLISHER_ID}/mission/${MISSION_ID}/edit`);
    await expect(page.getByRole("heading", { level: 1, name: "Modifier la mission" })).toBeVisible();
    await assertNotLoggedOut(page);

    await expectNoRgaaViolation(page, testInfo);
  });
});
