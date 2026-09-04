import { expect, test } from "@playwright/test";

import { PUBLISHER_ID, assertNotLoggedOut, setupUserMocks } from "../dashboard/fixtures";
import { expectNoRgaaViolation } from "./axe";

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
});
