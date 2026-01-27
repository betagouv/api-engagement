import { expect, test } from "@playwright/test";

test.describe("jstag.js - Syntax & Availability", () => {
  test("serves jstag.js with 200", async ({ request }) => {
    const response = await request.get("/jstag.js");
    expect(response.status()).toBe(200);
  });

  test("initializes without console errors", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));

    await page.goto("/test-jstag.html");
    await page.waitForTimeout(100);

    expect(errors).toHaveLength(0);
  });

  test("exposes window._apieng and window.apieng", async ({ page }) => {
    await page.goto("/test-jstag.html");

    expect(await page.evaluate(() => typeof (window as any)._apieng)).toBe("object");
    expect(await page.evaluate(() => typeof (window as any).apieng)).toBe("function");
  });

  test("has all expected methods", async ({ page }) => {
    await page.goto("/test-jstag.html");

    const methods = await page.evaluate(() =>
      ["config", "trackApplication", "trackAccount", "trackImpression", "confirmHuman", "getCookieValue", "setCookieValue", "getQueryParameter", "isHuman"].map(
        (m) => typeof (window as any)._apieng[m],
      ),
    );

    expect(methods.every((t) => t === "function")).toBe(true);
  });
});
