import { expect, test } from "@playwright/test";

test.describe("Middleware - Allowed paths", () => {
  test("allows /", async ({ page }) => {
    const response = await page.goto("/");
    expect(response?.status()).not.toBe(404);
  });

  test("allows /api/healthz", async ({ page }) => {
    const response = await page.goto("/api/healthz");
    expect(response?.status()).toBe(200);
  });

  test("allows /robots.txt", async ({ page }) => {
    const response = await page.goto("/robots.txt");
    expect(response?.status()).not.toBe(404);
  });
});

test.describe("Middleware - Blocked paths", () => {
  const blockedPaths = [
    "/login",
    "/index.php",
    "/wp-admin",
    "/mission/61a8535604be15075f3a99a0",
    "/.env",
    "/.git/config",
    "/admin",
    "/mod/jitsi/sessionpriv.php",
  ];

  for (const path of blockedPaths) {
    test(`blocks ${path}`, async ({ page }) => {
      const response = await page.goto(path);
      expect(response?.status()).toBe(404);
    });
  }
});
