import { expect, test } from "@playwright/test";

test.describe("jstag.js - Impression tracking", () => {
  test("tracks visible tracker elements", async ({ page }) => {
    const impressions: string[] = [];

    await page.route("**/r/impression/**", async (route) => {
      impressions.push(route.request().url());
      await route.fulfill({ status: 200 });
    });

    await page.goto("/test-jstag.html");
    await page.evaluate(() => {
      const el = document.createElement("div");
      el.setAttribute("data-name", "tracker_counter");
      el.setAttribute("data-id", "m1");
      el.setAttribute("data-publisher", "p1");
      document.body.appendChild(el);
    });

    // Wait for setInterval (750ms * 2)
    await page.waitForTimeout(1600);

    expect(impressions.some((u) => u.includes("/r/impression/m1/p1"))).toBe(true);
  });

  test("marks element as seen", async ({ page }) => {
    await page.route("**/r/impression/**", (route) => route.fulfill({ status: 200 }));

    await page.goto("/test-jstag.html");
    await page.evaluate(() => {
      const el = document.createElement("div");
      el.id = "tracker";
      el.setAttribute("data-name", "tracker_counter");
      el.setAttribute("data-id", "m1");
      el.setAttribute("data-publisher", "p1");
      document.body.appendChild(el);
    });

    await page.waitForTimeout(1600);

    const seen = await page.locator("#tracker").getAttribute("data-seen");
    expect(seen).toBe("true");
  });
});
