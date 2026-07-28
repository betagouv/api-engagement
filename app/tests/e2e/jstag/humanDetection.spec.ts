import { expect, test } from "@playwright/test";

test.describe("jstag.js - Human detection", () => {
  test("confirms human on interaction after 2s", async ({ page }) => {
    let confirmCalled = false;

    await page.route("**/r/*/confirm-human*", async (route) => {
      confirmCalled = true;
      expect(new URL(route.request().url()).searchParams.get("token")).toBe("test-token");
      await route.fulfill({ status: 200 });
    });

    await page.goto("/test-jstag.html?apiengagement_id=stat-123&apiengagement_tracking_token=test-token");

    // Wait 2.5s (2s threshold)
    await page.waitForTimeout(2500);

    // Trigger interaction
    const confirmationRequest = page.waitForRequest("**/r/*/confirm-human*");
    await page.mouse.move(100, 100);
    await confirmationRequest;

    expect(confirmCalled).toBe(true);
  });

  test("does not confirm before 2s", async ({ page }) => {
    let confirmCalled = false;
    await page.route("**/r/*/confirm-human*", () => {
      confirmCalled = true;
    });

    await page.goto("/test-jstag.html?apiengagement_id=stat-123&apiengagement_tracking_token=test-token");
    await page.mouse.move(100, 100);
    await page.waitForTimeout(200);

    expect(confirmCalled).toBe(false);
  });
});
