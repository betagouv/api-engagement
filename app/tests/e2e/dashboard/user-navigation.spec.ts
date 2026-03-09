import { test } from "@playwright/test";

import { PUBLISHER_ID, assertNotLoggedOut, setupUserMocks } from "./fixtures";

/**
 * E2E navigation tests for users with role: "user".
 *
 * Goal: ensure navigating user pages does not trigger a logout.
 *
 * Strategy: whitelist + catch-all 401.
 * Any non-whitelisted API call returns 401 → api.logout() → /login?loggedout=true.
 * If assertNotLoggedOut fails, a page called an unauthorized endpoint.
 *
 * Whitelisted endpoints here are validated by API integration tests (user-access.test.ts)
 * which guarantee they return 200 with a role: "user" token in production.
 */

test.describe("User navigation — no unintended logout", () => {
  test("My account", async ({ page }) => {
    await setupUserMocks(page);
    await page.goto(`/${PUBLISHER_ID}/my-account`);
    await assertNotLoggedOut(page);
  });

  test("Performance", async ({ page }) => {
    await setupUserMocks(page, [
      { method: "POST", path: "/mission/search", response: { ok: true, data: [], total: 0, aggs: {} } },
      { method: "POST", path: "/campaign/search", response: { ok: true, data: [], total: 0 } },
      { method: "POST", path: "/widget/search", response: { ok: true, data: [], total: 0 } },
      // GlobalAnnounce (flux="to") and GlobalBroadcast (flux="from") make Metabase calls for analytics
      { method: "POST", path: "/metabase/card/", response: { ok: true, data: { data: { rows: [], cols: [] } } } },
    ]);
    await page.goto(`/${PUBLISHER_ID}/performance`);
    await assertNotLoggedOut(page);
  });

  test("Broadcast — Widgets tab", async ({ page }) => {
    await setupUserMocks(page, [
      { method: "POST", path: "/widget/search", response: { ok: true, data: [], total: 0 } },
    ]);
    await page.goto(`/${PUBLISHER_ID}/broadcast`);
    await assertNotLoggedOut(page);
  });

  test("Settings — Flux tab", async ({ page }) => {
    await setupUserMocks(page, [
      { method: "POST", path: "/import/search", response: { ok: true, data: [], total: 0 } },
    ]);
    await page.goto(`/${PUBLISHER_ID}/settings`);
    await assertNotLoggedOut(page);
  });
});
