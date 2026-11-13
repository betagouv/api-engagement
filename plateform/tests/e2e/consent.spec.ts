import { expect, test, type Page } from "@playwright/test";

const deniedEvent = {
  event: "consent.updated",
  consent_google: "denied",
  consent_adform: "denied",
  consent_tiktok: "denied",
  consent_snapchat: "denied",
};

const readConsentEvents = (page: Page) => page.evaluate(() => window.dataLayer?.filter((item) => (item as { event?: string }).event === "consent.updated") ?? []);

test.describe("Consentements publicitaires", () => {
  let gtmRequests: number;

  test.beforeEach(async ({ page, baseURL }) => {
    gtmRequests = 0;
    // Ne jamais charger un vrai conteneur ni envoyer des données aux outils tiers pendant les tests.
    await page.route("**/*", async (route) => {
      const url = new URL(route.request().url());
      if (url.hostname === "www.googletagmanager.com" && url.pathname === "/gtm.js") {
        gtmRequests++;
        await route.fulfill({ contentType: "application/javascript", body: "" });
      } else if (url.origin === new URL(baseURL!).origin) {
        await route.continue();
      } else {
        await route.abort();
      }
    });
    await page.goto("/mentions-legales");
    await expect(page.getByRole("button", { name: "Personnaliser", exact: true })).toBeVisible();
  });

  test("aucun choix puis tout refuser : aucun chargement GTM, y compris après reload", async ({ page }) => {
    expect(await readConsentEvents(page)).toEqual([]);
    expect(gtmRequests).toBe(0);
    await expect(page.locator("#gtm-client")).toHaveCount(0);

    await page.getByRole("button", { name: "Tout refuser", exact: true }).click();
    await expect(page.locator(".fr-consent-banner")).toHaveCount(0);
    expect(await readConsentEvents(page)).toEqual([deniedEvent]);
    expect(gtmRequests).toBe(0);

    await page.reload();
    await expect(page.getByRole("link", { name: "Gestion des cookies", exact: true })).toBeVisible();
    await expect.poll(() => readConsentEvents(page)).toEqual([deniedEvent]);
    await expect(page.locator("#gtm-client")).toHaveCount(0);
    expect(gtmRequests).toBe(0);
  });

  for (const id of ["google", "adform", "tiktok", "snapchat"]) {
    test(`accord ${id} seul : un signal complet avant le chargement GTM`, async ({ page }) => {
      await page.getByRole("button", { name: "Personnaliser", exact: true }).click();
      const dialog = page.getByRole("dialog", { name: "Panneau de gestion des cookies" });
      await expect(dialog.getByText("Google Campaign Manager", { exact: true })).toBeVisible();
      await expect(dialog.getByText("Adform", { exact: true })).toBeVisible();
      await expect(dialog.getByText("TikTok", { exact: true })).toBeVisible();
      await expect(dialog.getByText("Snapchat", { exact: true })).toBeVisible();
      await dialog.locator(`label[for="consent-${id}-accept"]`).click();
      await expect(dialog.locator(`#consent-${id}-accept`)).toBeChecked();
      await dialog.getByRole("button", { name: "Confirmer mes choix" }).click();
      await expect(dialog).toBeHidden();

      await expect.poll(() => gtmRequests).toBe(1);
      expect(await readConsentEvents(page)).toEqual([{ ...deniedEvent, [`consent_${id}`]: "granted" }]);
      expect(await page.evaluate(() => window.dataLayer?.slice(0, 2))).toEqual([
        { ...deniedEvent, [`consent_${id}`]: "granted" },
        { event: "gtm.js", "gtm.start": expect.any(Number) },
      ]);
    });
  }

  test("navigation interne sans nouveau signal, puis retrait avec reload et maintien de l'autre accord", async ({ page }) => {
    await page.getByRole("button", { name: "Personnaliser", exact: true }).click();
    const dialog = page.getByRole("dialog", { name: "Panneau de gestion des cookies" });
    await dialog.locator('label[for="consent-tiktok-accept"]').click();
    await dialog.locator('label[for="consent-snapchat-accept"]').click();
    await dialog.getByRole("button", { name: "Confirmer mes choix" }).click();
    await expect.poll(() => gtmRequests).toBe(1);

    await page.getByRole("navigation", { name: "Navigation du pied de page" }).getByRole("link", { name: "Plan du site", exact: true }).click();
    await expect(page).toHaveURL(/\/plan-du-site$/);
    expect(await readConsentEvents(page)).toEqual([{ ...deniedEvent, consent_tiktok: "granted", consent_snapchat: "granted" }]);
    expect(gtmRequests).toBe(1);

    await page.getByRole("link", { name: "Gestion des cookies", exact: true }).click();
    await dialog.locator('label[for="consent-tiktok-refuse"]').click();
    await Promise.all([page.waitForEvent("framenavigated", (frame) => frame === page.mainFrame()), dialog.getByRole("button", { name: "Confirmer mes choix" }).click()]);
    await expect.poll(() => gtmRequests).toBe(2);
    expect(await readConsentEvents(page)).toEqual([{ ...deniedEvent, consent_snapchat: "granted" }]);
    await expect(page.locator(".fr-consent-banner")).toHaveCount(0);
  });
});
