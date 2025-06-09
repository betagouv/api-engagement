# Test info

- Name: Card component - Visual regression >> Mobile
- Location: /Users/valentin/Projects/freelance/beta/api-engagement/widget/tests/e2e/visual/Card.component.spec.ts:19:7

# Error details

```
Error: page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
Call log:
  - navigating to "/?widget=test-widget-id", waiting until "load"

    at /Users/valentin/Projects/freelance/beta/api-engagement/widget/tests/e2e/visual/Card.component.spec.ts:22:16
```

# Test source

```ts
   1 | import { expect, test } from "@playwright/test";
   2 |
   3 | test.describe("Card component - Visual regression", () => {
   4 |   test("Desktop", async ({ page }) => {
   5 |     await page.setViewportSize({ width: 1280, height: 800 });
   6 |
   7 |     await page.goto("/?widget=test-widget-id");
   8 |     await page.waitForSelector('[data-testid="mission-card"]', { timeout: 10000 });
   9 |
  10 |     const cardElement = await page.locator('[data-testid="mission-card"]').first();
  11 |     await expect(cardElement).toBeVisible();
  12 |     await expect(cardElement).toHaveScreenshot("card-desktop.png");
  13 |
  14 |     await cardElement.hover();
  15 |     await page.waitForTimeout(300);
  16 |     await expect(cardElement).toHaveScreenshot("card-hover-desktop.png");
  17 |   });
  18 |
  19 |   test("Mobile", async ({ page }) => {
  20 |     await page.setViewportSize({ width: 375, height: 667 });
  21 |
> 22 |     await page.goto("/?widget=test-widget-id");
     |                ^ Error: page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
  23 |     await page.waitForSelector('[data-testid="mission-card"]', { timeout: 10000 });
  24 |
  25 |     const cardElement = await page.locator('[data-testid="mission-card"]').first();
  26 |     await expect(cardElement).toBeVisible();
  27 |     await expect(cardElement).toHaveScreenshot("card-mobile.png");
  28 |   });
  29 | });
  30 |
```