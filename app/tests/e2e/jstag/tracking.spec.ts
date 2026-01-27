import { expect, test } from "@playwright/test";

test.describe("jstag.js - trackApplication()", () => {
  test("sends request to /r/apply", async ({ page }) => {
    await page.route("**/r/apply*", async (route) => {
      await route.fulfill({ status: 200, body: JSON.stringify({ ok: true }) });
    });

    await page.goto("/test-jstag.html?apiengagement_id=click-123");

    const requestPromise = page.waitForRequest((req) => req.url().includes("/r/apply"));

    await page.evaluate(() => {
      (window as any)._apieng.config("pub-456");
      (window as any)._apieng.trackApplication("mission-789", { key: "value" });
    });

    const applyRequest = await requestPromise;
    const applyUrl = new URL(applyRequest.url());

    expect(applyUrl.searchParams.get("view")).toBe("click-123");
    expect(applyUrl.searchParams.get("publisher")).toBe("pub-456");
    expect(applyUrl.searchParams.get("mission")).toBe("mission-789");
  });

  test("does nothing without apiengagement_id", async ({ page }) => {
    let requestMade = false;
    await page.route("**/r/apply*", async (route) => {
      requestMade = true;
      await route.fulfill({ status: 200 });
    });

    await page.goto("/test-jstag.html"); // no apiengagement_id
    await page.evaluate(() => (window as any)._apieng.trackApplication("m1"));
    await page.waitForTimeout(100);

    expect(requestMade).toBe(false);
  });
});

test.describe("jstag.js - trackAccount()", () => {
  test("sends request to /r/account", async ({ page }) => {
    await page.route("**/r/account*", async (route) => {
      await route.fulfill({ status: 200 });
    });

    await page.goto("/test-jstag.html?apiengagement_id=click-abc");

    const requestPromise = page.waitForRequest((req) => req.url().includes("/r/account"));

    await page.evaluate(() => {
      (window as any)._apieng.trackAccount("mission-def", { clientEventId: "evt-1" });
    });

    const accountRequest = await requestPromise;
    const accountUrl = new URL(accountRequest.url());

    expect(accountUrl.searchParams.get("mission")).toBe("mission-def");
    expect(accountUrl.searchParams.get("clientEventId")).toBe("evt-1");
  });
});
