import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, type TestInfo } from "@playwright/test";

const RGAA_TAGS = ["RGAAv4"];

export const expectNoRgaaViolation = async (page: Page, testInfo: TestInfo) => {
  const results = await new AxeBuilder({ page })
    .withTags(RGAA_TAGS)
    // Axe assimile tout contenu hors d'un landmark à un échec du RGAA 9.2.1,
    // alors que ce critère exige uniquement de structurer header, nav, main et footer.
    .disableRules(["region"])
    .analyze();

  await testInfo.attach("axe-rgaa-results", {
    body: JSON.stringify(results, null, 2),
    contentType: "application/json",
  });

  const summary = results.violations
    .map((violation) => {
      const targets = violation.nodes.map((node) => `  - ${node.target.join(" > ")}`).join("\n");
      return `${violation.id} (${violation.impact ?? "impact inconnu"}) — ${violation.help}\n${targets}`;
    })
    .join("\n\n");

  expect(results.violations.length, summary || "Aucune violation RGAA détectée automatiquement").toBe(0);
};
