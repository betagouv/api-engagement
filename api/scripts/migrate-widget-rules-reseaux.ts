/**
 * Migration : renomme les champs de règles widget liés aux réseaux.
 *
 * - associationReseaux → parentOrganization
 * - organizationNetwork → parentOrganization
 * - organizationReseaux → parentOrganization
 *
 * Normalise aussi les opérateurs des champs array :
 * - "is" → "contains"
 * - "is_not" → "does_not_contain"
 *
 * Run with:
 *   npx ts-node --transpile-only scripts/migrate-widget-rules-reseaux.ts
 *   npx ts-node --transpile-only scripts/migrate-widget-rules-reseaux.ts --dry-run
 */
import dotenv from "dotenv";
dotenv.config();

import { prisma } from "@/db/postgres";

const RESEAUX_FIELDS = ["associationReseaux", "organizationNetwork", "organizationReseaux"];
const ARRAY_FIELDS = ["associationReseaux", "organizationActions", "organizationNetwork", "organizationReseaux", "parentOrganization", "tags"];

const OPERATOR_MAPPING: Record<string, string> = {
  is: "contains",
  is_not: "does_not_contain",
};

const isDryRun = process.argv.includes("--dry-run");

const run = async () => {
  await prisma.$connect();

  if (isDryRun) {
    console.log("[DRY RUN] No changes will be made.\n");
  }

  // 1. Rename reseaux fields to parentOrganization
  const reseauxRules = await prisma.widgetRule.findMany({
    where: { field: { in: RESEAUX_FIELDS } },
    include: { widget: { select: { id: true, name: true } } },
  });

  console.log(`=== Renaming reseaux fields → parentOrganization (${reseauxRules.length} rules) ===\n`);
  for (const rule of reseauxRules) {
    console.log(`  [${rule.widget.name}] ${rule.field} ${rule.operator} "${rule.value}" → parentOrganization`);
    if (!isDryRun) {
      await prisma.widgetRule.update({
        where: { id: rule.id },
        data: { field: "parentOrganization" },
      });
    }
  }
  if (!reseauxRules.length) console.log("  (none)");
  console.log();

  // 2. Normalize operators on array fields (is → contains, is_not → does_not_contain)
  const arrayRulesWithBadOperator = await prisma.widgetRule.findMany({
    where: {
      field: { in: ARRAY_FIELDS },
      operator: { in: Object.keys(OPERATOR_MAPPING) },
    },
    include: { widget: { select: { id: true, name: true } } },
  });

  console.log(`=== Normalizing array field operators (${arrayRulesWithBadOperator.length} rules) ===\n`);
  for (const rule of arrayRulesWithBadOperator) {
    const newOperator = OPERATOR_MAPPING[rule.operator];
    console.log(`  [${rule.widget.name}] ${rule.field}: ${rule.operator} → ${newOperator}`);
    if (!isDryRun) {
      await prisma.widgetRule.update({
        where: { id: rule.id },
        data: { operator: newOperator },
      });
    }
  }
  if (!arrayRulesWithBadOperator.length) console.log("  (none)");
  console.log();

  console.log(isDryRun ? "[DRY RUN] Done. Re-run without --dry-run to apply changes." : "Done.");

  await prisma.$disconnect();
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
