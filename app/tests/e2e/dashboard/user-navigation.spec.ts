import { test } from "@playwright/test";

import { PUBLISHER_ID, assertNotLoggedOut, setupUserMocks } from "./fixtures";

/**
 * Tests E2E de navigation pour les utilisateurs role: "user".
 *
 * Objectif : s'assurer que naviguer sur les pages user ne provoque pas de déconnexion.
 *
 * Stratégie : whitelist + catch-all 401.
 * Tout appel API non whitelisté retourne 401 → api.logout() → /login?loggedout=true.
 * Si assertNotLoggedOut échoue, une page a appelé un endpoint non autorisé.
 *
 * Les endpoints whitelistés ici sont validés par les tests d'intégration API (user-access.test.ts)
 * qui garantissent qu'ils retournent bien 200 avec un token role: "user" en production.
 */

test.describe("Navigation user — aucune déconnexion involontaire", () => {
  test("Mon compte", async ({ page }) => {
    await setupUserMocks(page);
    await page.goto(`/${PUBLISHER_ID}/my-account`);
    await assertNotLoggedOut(page);
  });

  test("Performance", async ({ page }) => {
    await setupUserMocks(page, [
      { method: "POST", path: "/mission/search", response: { ok: true, data: [], total: 0, aggs: {} } },
      { method: "POST", path: "/campaign/search", response: { ok: true, data: [], total: 0 } },
      { method: "POST", path: "/widget/search", response: { ok: true, data: [], total: 0 } },
    ]);
    await page.goto(`/${PUBLISHER_ID}/performance`);
    await assertNotLoggedOut(page);
  });

  test("Broadcast — onglet Widgets", async ({ page }) => {
    await setupUserMocks(page, [
      { method: "POST", path: "/widget/search", response: { ok: true, data: [], total: 0 } },
    ]);
    await page.goto(`/${PUBLISHER_ID}/broadcast`);
    await assertNotLoggedOut(page);
  });

  test("Settings — onglet Flux", async ({ page }) => {
    await setupUserMocks(page, [
      { method: "POST", path: "/import/search", response: { ok: true, data: [], total: 0 } },
    ]);
    await page.goto(`/${PUBLISHER_ID}/settings`);
    await assertNotLoggedOut(page);
  });
});
