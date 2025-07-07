import { expect, test } from "@playwright/test";
import { WIDGET_IDS } from "./fixtures/mockData";

test.describe("Accessibility Landmarks", () => {
  test("should have correct landmark structure", async ({ page }) => {
    await page.goto(`/?widget=${WIDGET_IDS.BENEVOLAT}`);

    // Check that the main content is wrapped in a <main> tag with role="main".
    const main = page.locator('main[role="main"]');
    await expect(main).toHaveCount(1, { timeout: 5000 });

    // Check that there is a header with role="banner".
    const header = page.locator('header[role="banner"]');
    await expect(header).toHaveCount(1);

    // Check that if a footer exists, it has role="contentinfo".
    const footerLocator = page.locator("footer");
    if ((await footerLocator.count()) > 0) {
      await expect(footerLocator).toHaveAttribute("role", "contentinfo");
    }

    // Check that if a nav exists, it has role="navigation".
    const navLocator = page.locator("nav");
    if ((await navLocator.count()) > 0) {
      await expect(navLocator).toHaveAttribute("role", "navigation");
    }
  });
});
