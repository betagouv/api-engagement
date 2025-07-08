import { expect, test } from "@playwright/test";
import { WIDGET_IDS } from "../fixtures/mockData";

test.describe("Accessibility Landmarks", () => {
  test("Benevolat widget (Page) should have correct landmark structure", async ({ page }) => {
    await page.goto(`/?widget=${WIDGET_IDS.BENEVOLAT.PAGE}`);
    await checkLandmarks(page);
  });

  test("Benevolat widget (Carousel) should have correct landmark structure", async ({ page }) => {
    await page.goto(`/?widget=${WIDGET_IDS.BENEVOLAT.CAROUSEL}`);
    await checkLandmarks(page);
  });

  test("Volontariat widget (Page) should have correct landmark structure", async ({ page }) => {
    await page.goto(`/?widget=${WIDGET_IDS.VOLONTARIAT.PAGE}`);
    await checkLandmarks(page);

    // Footer is only present for volontariat widget
    await checkFooter(page);
  });

  test("Volontariat widget (Carousel) should have correct landmark structure", async ({ page }) => {
    await page.goto(`/?widget=${WIDGET_IDS.VOLONTARIAT.CAROUSEL}`);
    await checkLandmarks(page);

    // Footer is only present for volontariat widget
    await checkFooter(page);
  });
});

const checkLandmarks = async (page) => {
  const main = page.locator('main[role="main"]');
  await expect(main).toHaveCount(1, { timeout: 5000 });

  const header = page.locator('header[role="banner"]');
  await expect(header).toHaveCount(1);

  // Check that no element is nested inside another one
  await expect(page.locator("main header")).toHaveCount(0);
  await expect(page.locator("main footer")).toHaveCount(0);
  await expect(page.locator("header main")).toHaveCount(0);
  await expect(page.locator("header footer")).toHaveCount(0);
  await expect(page.locator("footer header")).toHaveCount(0);
  await expect(page.locator("footer main")).toHaveCount(0);
};

const checkFooter = async (page) => {
  const footer = page.locator('footer[role="contentinfo"]');
  await expect(footer).toHaveCount(1);
};
