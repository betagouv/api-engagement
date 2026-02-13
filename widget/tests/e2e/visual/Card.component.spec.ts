import { expect, test } from "@playwright/test";
import { WIDGET_IDS } from "../fixtures/mockData";

test.describe("Card component (bénévolat) - Visual regression", () => {
  test("Desktop", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });

    await page.goto(`/?widget=${WIDGET_IDS.BENEVOLAT.PAGE}`);
    await page.waitForSelector('[data-testid="mission-card"]', { timeout: 10000 });

    const cardElement = await page.locator('[data-testid="mission-card"]').first();
    await page.waitForTimeout(1000);
    await expect(cardElement).toBeVisible();
    await expect(cardElement).toHaveScreenshot("card-benevolat-desktop.png");

    await cardElement.hover();
    await page.waitForTimeout(300);
    await expect(cardElement).toHaveScreenshot("card-benevolat-hover-desktop.png");
  });

  test("Mobile", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });

    await page.goto(`/?widget=${WIDGET_IDS.BENEVOLAT.PAGE}`);
    await page.waitForSelector('[data-testid="mission-card"]', { timeout: 10000 });

    const cardElement = await page.locator('[data-testid="mission-card"]').first();
    await page.waitForTimeout(1000);
    await expect(cardElement).toBeVisible();
    await expect(cardElement).toHaveScreenshot("card-benevolat-mobile.png");
  });
});

test.describe("Card component (volontariat) - Visual regression", () => {
  test("Desktop", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });

    await page.goto(`/?widget=${WIDGET_IDS.VOLONTARIAT.PAGE}`);
    await page.waitForSelector('[data-testid="mission-card"]', { timeout: 10000 });

    const cardElement = await page.locator('[data-testid="mission-card"]').first();
    await expect(cardElement).toBeVisible();
    await expect(cardElement).toHaveScreenshot("card-volontariat-desktop.png");

    await cardElement.hover();
    await page.waitForTimeout(300);
    await expect(cardElement).toHaveScreenshot("card-volontariat-hover-desktop.png");
  });

  test("Mobile", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });

    await page.goto(`/?widget=${WIDGET_IDS.VOLONTARIAT.PAGE}`);
    await page.waitForSelector('[data-testid="mission-card"]', { timeout: 10000 });

    const cardElement = await page.locator('[data-testid="mission-card"]').first();
    await expect(cardElement).toBeVisible();
    await expect(cardElement).toHaveScreenshot("card-volontariat-mobile.png");
  });
});
