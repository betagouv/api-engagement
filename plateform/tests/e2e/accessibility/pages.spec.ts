import { expect, test } from "@playwright/test";

import { expectNoRgaaViolation } from "./axe";

test.describe("Accessibilité RGAA", { tag: "@a11y" }, () => {
  test("Accueil", async ({ page }, testInfo) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1, name: /À chacun/ })).toBeVisible();

    await expectNoRgaaViolation(page, testInfo);
  });

  test("Quiz — âge", async ({ page }, testInfo) => {
    await page.goto("/quiz/age");
    await expect(page.getByRole("heading", { level: 1, name: /Quel âge as-tu/ })).toBeVisible();

    await expectNoRgaaViolation(page, testInfo);
  });

  test("Quiz — erreur de validation", async ({ page }, testInfo) => {
    await page.goto("/quiz/age");
    await page.getByRole("button", { name: "Tout refuser" }).click();
    await page.getByRole("button", { name: "Continuer" }).click();
    await expect(page.getByText("Sélectionne ton âge pour continuer")).toBeVisible();

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
    await page.goto("/quiz/handicap");
    await expect(page.getByRole("heading", { level: 1, name: /Es-tu en situation de handicap reconnue/ })).toBeVisible();

    await expectNoRgaaViolation(page, testInfo);
  });

  test("Quiz — cases à cocher", async ({ page }, testInfo) => {
    await page.goto("/quiz/mobilite");
    await expect(page.getByRole("heading", { level: 1, name: /Comment tu te déplaces généralement/ })).toBeVisible();

    await expectNoRgaaViolation(page, testInfo);
  });

  test("Quiz — localisation", async ({ page }, testInfo) => {
    await page.goto("/quiz/localisation");
    await expect(page.getByRole("heading", { level: 1, name: /Où veux-tu chercher des missions/ })).toBeVisible();

    await expectNoRgaaViolation(page, testInfo);
  });

  test("Plan du site", async ({ page }, testInfo) => {
    await page.goto("/plan-du-site");
    await expect(page.getByRole("heading", { level: 1, name: "Plan du site" })).toBeVisible();

    await expectNoRgaaViolation(page, testInfo);
  });

  test("Mentions légales", async ({ page }, testInfo) => {
    await page.goto("/mentions-legales");
    await expect(page.getByRole("heading", { level: 1, name: "Mentions légales" })).toBeVisible();

    await expectNoRgaaViolation(page, testInfo);
  });

  test("Politique de confidentialité", async ({ page }, testInfo) => {
    await page.goto("/politique-de-confidentialite");
    await expect(page.getByRole("heading", { level: 1, name: /Politique de confidentialité/ })).toBeVisible();

    await expectNoRgaaViolation(page, testInfo);
  });
});
