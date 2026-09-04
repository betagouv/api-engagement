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
    expect(await page.evaluate(() => window.sessionStorage.getItem("apiengagement_tracking_id"))).toBe("stat-123");
    expect(await page.evaluate(() => window.sessionStorage.getItem("apiengagement_tracking_token"))).toBe("test-token");

    // Wait 2.5s (2s threshold)
    await page.waitForTimeout(2500);

    // Trigger interaction
    const confirmationRequest = page.waitForRequest("**/r/*/confirm-human*");
    await page.mouse.move(100, 100);
    await confirmationRequest;

    expect(confirmCalled).toBe(true);
  });

  test("keeps confirmation data isolated between tabs", async ({ context, page }) => {
    const secondPage = await context.newPage();
    const firstClickId = "stat-first";
    const secondClickId = "stat-second";
    const firstToken = "token-first";
    const secondToken = "token-second";

    await context.route("**/r/*/confirm-human*", async (route) => {
      await route.fulfill({ status: 200 });
    });

    await Promise.all([
      page.goto(`/test-jstag.html?apiengagement_id=${firstClickId}&apiengagement_tracking_token=${firstToken}`),
      secondPage.goto(`/test-jstag.html?apiengagement_id=${secondClickId}&apiengagement_tracking_token=${secondToken}`),
    ]);
    await page.waitForTimeout(2500);

    const firstConfirmation = page.waitForRequest((request) => {
      const url = new URL(request.url());
      return url.pathname === `/r/${firstClickId}/confirm-human` && url.searchParams.get("token") === firstToken;
    });
    await page.mouse.move(100, 100);
    await firstConfirmation;

    const secondConfirmation = secondPage.waitForRequest((request) => {
      const url = new URL(request.url());
      return url.pathname === `/r/${secondClickId}/confirm-human` && url.searchParams.get("token") === secondToken;
    });
    await secondPage.mouse.move(100, 100);
    await secondConfirmation;
  });

  test("confirms a legacy redirect without a token", async ({ page }) => {
    await page.route("**/r/*/confirm-human*", async (route) => {
      expect(new URL(route.request().url()).searchParams.has("token")).toBe(false);
      await route.fulfill({ status: 200 });
    });

    await page.goto("/test-jstag.html?apiengagement_id=legacy-stat");
    await page.waitForTimeout(2500);

    const confirmationRequest = page.waitForRequest("**/r/legacy-stat/confirm-human");
    await page.mouse.move(100, 100);
    await confirmationRequest;
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
