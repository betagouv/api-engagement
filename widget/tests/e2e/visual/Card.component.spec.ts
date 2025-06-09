import { expect, test } from "@playwright/test";

test.describe("Card component - Visual regression", () => {
  test("Desktop", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });

    await page.goto("/?widget=test-widget-id");
    await page.waitForSelector('[data-testid="mission-card"]', { timeout: 10000 });

    const cardElement = await page.locator('[data-testid="mission-card"]').first();
    await expect(cardElement).toBeVisible();
    await expect(cardElement).toHaveScreenshot("card-desktop.png");

    await cardElement.hover();
    await page.waitForTimeout(300);
    await expect(cardElement).toHaveScreenshot("card-hover-desktop.png");
  });

  test("Mobile", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });

    await page.goto("/?widget=test-widget-id");
    await page.waitForSelector('[data-testid="mission-card"]', { timeout: 10000 });

    const cardElement = await page.locator('[data-testid="mission-card"]').first();
    await expect(cardElement).toBeVisible();
    await expect(cardElement).toHaveScreenshot("card-mobile.png");
  });
});
