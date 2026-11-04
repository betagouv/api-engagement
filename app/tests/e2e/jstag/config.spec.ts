import { expect, test } from "@playwright/test";

test.describe("jstag.js - config()", () => {
  test("sets accountId", async ({ page }) => {
    await page.goto("/test-jstag.html");

    await page.evaluate(() => (window as any)._apieng.config("test-account"));
    const accountId = await page.evaluate(() => (window as any)._apieng.accountId);

    expect(accountId).toBe("test-account");
  });

  test("works via command queue", async ({ page }) => {
    await page.goto("/test-jstag.html");

    await page.evaluate(() => (window as any).apieng("config", "queue-account"));
    const accountId = await page.evaluate(() => (window as any)._apieng.accountId);

    expect(accountId).toBe("queue-account");
  });

  test("defaults eventHost to production when not served from an app.* host", async ({ page }) => {
    await page.goto("/test-jstag.html");

    const eventHost = await page.evaluate(() => (window as any)._apieng.eventHost);

    expect(eventHost).toBe("https://api.api-engagement.beta.gouv.fr");
  });
});
