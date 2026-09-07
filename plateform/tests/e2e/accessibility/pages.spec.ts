import { test, type Page } from "@playwright/test";

import { expectNoRgaaViolation } from "./axe";

async function rejectOptionalCookies(page: Page) {
  const rejectButton = page.getByRole("button", { name: "Tout refuser" });

  try {
    // Le bandeau n'est pas rendu en CI lorsque aucun service de suivi n'est configuré.
    await rejectButton.waitFor({ state: "visible", timeout: 1_000 });
  } catch {
    return;
  }

  await rejectButton.click();
}

async function gotoPage(page: Page, path: string) {
  await page.goto(path);
  await page.getByRole("main").waitFor({ state: "visible" });
}

test.describe("Accessibilité RGAA", { tag: "@a11y" }, () => {
  test("Accueil", async ({ page }, testInfo) => {
    await gotoPage(page, "/");

    await expectNoRgaaViolation(page, testInfo);
  });

  test("Quiz — âge", async ({ page }, testInfo) => {
    await gotoPage(page, "/quiz/age");

    await expectNoRgaaViolation(page, testInfo);
  });

  test("Quiz — erreur de validation", async ({ page }, testInfo) => {
    await gotoPage(page, "/quiz/age");
    await rejectOptionalCookies(page);
    await page.getByRole("button", { name: "Continuer" }).click();
    await page.locator('[aria-invalid="true"]').waitFor({ state: "visible" });

    await expectNoRgaaViolation(page, testInfo);
  });

  test("Quiz — boutons radio", async ({ page }, testInfo) => {
    await page.addInitScript(() => {
      localStorage.setItem(
        "quiz-answers",
        JSON.stringify({
          state: { answers: { age: { type: "numeric", value: 28 } } },
          version: 5,
        }),
      );
    });
    await gotoPage(page, "/quiz/handicap");

    await expectNoRgaaViolation(page, testInfo);
  });

  test("Quiz — cases à cocher", async ({ page }, testInfo) => {
    await gotoPage(page, "/quiz/mobilite");

    await expectNoRgaaViolation(page, testInfo);
  });

  test("Quiz — localisation", async ({ page }, testInfo) => {
    await gotoPage(page, "/quiz/localisation");

    await expectNoRgaaViolation(page, testInfo);
  });

  test("Plan du site", async ({ page }, testInfo) => {
    await gotoPage(page, "/plan-du-site");

    await expectNoRgaaViolation(page, testInfo);
  });

  test("Mentions légales", async ({ page }, testInfo) => {
    await gotoPage(page, "/mentions-legales");

    await expectNoRgaaViolation(page, testInfo);
  });

  test("Politique de confidentialité", async ({ page }, testInfo) => {
    await gotoPage(page, "/politique-de-confidentialite");

    await expectNoRgaaViolation(page, testInfo);
  });
});
