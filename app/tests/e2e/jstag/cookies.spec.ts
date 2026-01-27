import { expect, test } from "@playwright/test";

test.describe("jstag.js - Cookie management", () => {
  test("setCookieValue creates cookie", async ({ page, context }) => {
    await page.goto("/test-jstag.html");

    await page.evaluate(() => {
      (window as any)._apieng.setCookieValue("testKey", "testValue");
    });

    const cookies = await context.cookies();
    const testCookie = cookies.find((c) => c.name === "testKey");

    expect(testCookie).toBeDefined();
    expect(testCookie!.value).toBe("testValue");
  });

  test("getCookieValue reads cookie", async ({ page, context }) => {
    await context.addCookies([
      {
        name: "existingKey",
        value: "existingValue",
        domain: "localhost",
        path: "/",
      },
    ]);

    await page.goto("/test-jstag.html");

    const value = await page.evaluate(() => (window as any)._apieng.getCookieValue("existingKey"));

    expect(value).toBe("existingValue");
  });

  test("getCookieValue returns null for missing", async ({ page }) => {
    await page.goto("/test-jstag.html");

    const value = await page.evaluate(() => (window as any)._apieng.getCookieValue("nonexistent"));

    expect(value).toBeNull();
  });
});
