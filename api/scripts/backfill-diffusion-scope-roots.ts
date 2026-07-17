import dotenv from "dotenv";
import fs from "fs";
import path from "path";

const SCRIPT_NAME = "BackfillDiffusionScopeRoots";

type Options = {
  apply: boolean;
  envPath?: string;
  json: boolean;
  apiAllowlists: Map<string, string[]>;
};

type AuditReason = "api_without_roots" | "diffuser_without_roots" | "rules_without_allowlist" | "widget_missing_roots";

type AuditRow = {
  diffuserId: string;
  diffuserName: string;
  reasons: AuditReason[];
  existingRoots: string[];
  rootsToCreate: string[];
  blockers: string[];
};

const parseOptions = (argv: string[]): Options => {
  const options: Options = { apply: false, json: false, apiAllowlists: new Map() };
  const args = [...argv];

  while (args.length) {
    const arg = args.shift();
    switch (arg) {
      case "--apply":
        options.apply = true;
        break;
      case "--dry-run":
        options.apply = false;
        break;
      case "--env":
        options.envPath = args.shift();
        break;
      case "--json":
        options.json = true;
        break;
      case "--api-allowlist": {
        const value = args.shift() ?? fail("Missing value after --api-allowlist");
        const [diffuserId, publisherList] = value.split(":");
        const publisherIds =
          publisherList
            ?.split(",")
            .map((id) => id.trim())
            .filter(Boolean) ?? [];
        if (!diffuserId || publisherIds.length === 0) {
          fail(`Invalid --api-allowlist value "${value}". Expected diffuserId:publisherId1,publisherId2`);
        }
        options.apiAllowlists.set(diffuserId.trim(), publisherIds);
        break;
      }
      default:
        fail(`Unexpected argument: ${arg}`);
    }
  }

  return options;
};

const fail = (message: string): never => {
  console.error(`[${SCRIPT_NAME}] ${message}`);
  console.error(
    `Usage: npx ts-node scripts/backfill-diffusion-scope-roots.ts [--env <path>] [--dry-run|--apply] [--json] [--api-allowlist diffuserId:publisherId1,publisherId2]...`
  );
  process.exit(1);
};

const loadEnvironment = (envPath?: string) => {
  if (!envPath) {
    dotenv.config({ quiet: true });
    return;
  }

  const candidate = path.isAbsolute(envPath) ? envPath : path.resolve(process.cwd(), envPath);
  if (!fs.existsSync(candidate)) {
    fail(`Env file not found: ${candidate}`);
  }
  console.error(`[${SCRIPT_NAME}] Loading environment variables from ${candidate}`);
  dotenv.config({ path: candidate, override: true, quiet: true });
};

const addReason = (reasons: Set<AuditReason>, reason: AuditReason) => {
  reasons.add(reason);
};

const addDesiredRoots = (map: Map<string, Set<string>>, diffuserId: string, publisherIds: string[]) => {
  const roots = map.get(diffuserId) ?? new Set<string>();
  for (const publisherId of publisherIds) {
    roots.add(publisherId);
  }
  map.set(diffuserId, roots);
};

const options = parseOptions(process.argv.slice(2));
loadEnvironment(options.envPath);

async function main() {
  const { prisma } = await import("@/db/postgres");
  const { publisherDiffusionRuleService, DIFFUSION_SCOPE_ROOT_CRITERIA } = await import("@/services/publisher-diffusion-rule");

  const [diffusers, rules, activeWidgets] = await Promise.all([
    prisma.publisher.findMany({
      where: {
        deletedAt: null,
        OR: [{ hasApiRights: true }, { hasWidgetRights: true }, { hasCampaignRights: true }],
      },
      select: { id: true, name: true, hasApiRights: true, hasWidgetRights: true, hasCampaignRights: true },
      orderBy: { name: "asc" },
    }),
    prisma.publisherDiffusionRule.findMany({
      select: { publisherId: true, combinedWithId: true, field: true, operator: true, value: true },
    }),
    prisma.widget.findMany({
      where: { active: true, deletedAt: null },
      select: {
        id: true,
        name: true,
        fromPublisherId: true,
        widgetPublishers: { select: { publisherId: true } },
      },
      orderBy: { name: "asc" },
    }),
  ]);

  const widgetFromPublisherIds = Array.from(new Set(activeWidgets.map((widget) => widget.fromPublisherId)));
  const widgetFromPublishers = await prisma.publisher.findMany({
    where: { id: { in: widgetFromPublisherIds } },
    select: { id: true, name: true, hasApiRights: true, hasWidgetRights: true, hasCampaignRights: true },
  });
  const diffusersById = new Map([...diffusers, ...widgetFromPublishers].map((diffuser) => [diffuser.id, diffuser]));
  const rulesByPublisherId = new Map<string, typeof rules>();
  const rootsByPublisherId = new Map<string, string[]>();
  const desiredRootsByPublisherId = new Map<string, Set<string>>();
  const reasonsByPublisherId = new Map<string, Set<AuditReason>>();
  const blockersByPublisherId = new Map<string, string[]>();

  const reasonsFor = (publisherId: string) => {
    const reasons = reasonsByPublisherId.get(publisherId) ?? new Set<AuditReason>();
    reasonsByPublisherId.set(publisherId, reasons);
    return reasons;
  };
  const blockersFor = (publisherId: string) => {
    const blockers = blockersByPublisherId.get(publisherId) ?? [];
    blockersByPublisherId.set(publisherId, blockers);
    return blockers;
  };

  for (const rule of rules) {
    const publisherRules = rulesByPublisherId.get(rule.publisherId) ?? [];
    publisherRules.push(rule);
    rulesByPublisherId.set(rule.publisherId, publisherRules);

    if (
      rule.combinedWithId === DIFFUSION_SCOPE_ROOT_CRITERIA.combinedWithId &&
      rule.field === DIFFUSION_SCOPE_ROOT_CRITERIA.field &&
      rule.operator === DIFFUSION_SCOPE_ROOT_CRITERIA.operator
    ) {
      const roots = rootsByPublisherId.get(rule.publisherId) ?? [];
      roots.push(rule.value);
      rootsByPublisherId.set(rule.publisherId, roots);
    }
  }

  for (const widget of activeWidgets) {
    const widgetPublisherIds = widget.widgetPublishers.map((publisher) => publisher.publisherId);
    if (!widgetPublisherIds.length) {
      addReason(reasonsFor(widget.fromPublisherId), "widget_missing_roots");
      blockersFor(widget.fromPublisherId).push(`Widget ${widget.id} (${widget.name}) has no widget_publisher allowlist`);
      continue;
    }
    addReason(reasonsFor(widget.fromPublisherId), "widget_missing_roots");
    addDesiredRoots(desiredRootsByPublisherId, widget.fromPublisherId, widgetPublisherIds);
  }

  for (const [diffuserId, publisherIds] of options.apiAllowlists) {
    addDesiredRoots(desiredRootsByPublisherId, diffuserId, publisherIds);
  }

  for (const diffuser of diffusers) {
    const rulesForDiffuser = rulesByPublisherId.get(diffuser.id) ?? [];
    const rootsForDiffuser = rootsByPublisherId.get(diffuser.id) ?? [];
    const hasRoots = rootsForDiffuser.length > 0;

    if (rulesForDiffuser.length > 0 && !hasRoots) {
      addReason(reasonsFor(diffuser.id), "rules_without_allowlist");
      addDesiredRoots(desiredRootsByPublisherId, diffuser.id, [diffuser.id]);
    }

    if (!hasRoots) {
      addReason(reasonsFor(diffuser.id), diffuser.hasApiRights ? "api_without_roots" : "diffuser_without_roots");

      if (diffuser.hasApiRights && !options.apiAllowlists.has(diffuser.id)) {
        blockersFor(diffuser.id).push("API diffuser without explicit --api-allowlist");
      }

      if (!diffuser.hasApiRights && !desiredRootsByPublisherId.has(diffuser.id)) {
        addDesiredRoots(desiredRootsByPublisherId, diffuser.id, [diffuser.id]);
      }
    }
  }

  const auditRows: AuditRow[] = Array.from(reasonsByPublisherId.entries())
    .map(([diffuserId, reasons]) => {
      const diffuser = diffusersById.get(diffuserId);
      const existingRoots = Array.from(new Set(rootsByPublisherId.get(diffuserId) ?? [])).sort();
      const desiredRoots = Array.from(desiredRootsByPublisherId.get(diffuserId) ?? []).sort();
      const existing = new Set(existingRoots);
      const rootsToCreate = desiredRoots.filter((publisherId) => !existing.has(publisherId));

      return {
        diffuserId,
        diffuserName: diffuser?.name ?? "Unknown publisher",
        reasons: Array.from(reasons).sort(),
        existingRoots,
        rootsToCreate,
        blockers: blockersByPublisherId.get(diffuserId) ?? [],
      };
    })
    .filter((row) => row.rootsToCreate.length > 0 || row.blockers.length > 0)
    .sort((left, right) => left.diffuserName.localeCompare(right.diffuserName));

  const blockerCount = auditRows.reduce((sum, row) => sum + row.blockers.length, 0);
  const rootsToCreateCount = auditRows.reduce((sum, row) => sum + row.rootsToCreate.length, 0);

  if (options.json) {
    console.log(
      JSON.stringify(
        {
          mode: options.apply ? "apply" : "dry-run",
          generatedAt: new Date().toISOString(),
          summary: { diffusers: auditRows.length, rootsToCreate: rootsToCreateCount, blockers: blockerCount },
          diffusers: auditRows,
        },
        null,
        2
      )
    );
  } else {
    console.log(`[${SCRIPT_NAME}] Mode: ${options.apply ? "apply" : "dry-run"}`);
    console.log(`[${SCRIPT_NAME}] Diffusers to review: ${auditRows.length}`);
    console.log(`[${SCRIPT_NAME}] Roots to create: ${rootsToCreateCount}`);
    console.log(`[${SCRIPT_NAME}] Blockers: ${blockerCount}`);
    for (const row of auditRows) {
      console.log(`\n- ${row.diffuserName} (${row.diffuserId})`);
      console.log(`  reasons: ${row.reasons.join(", ")}`);
      console.log(`  existing roots: ${row.existingRoots.length}`);
      console.log(`  roots to create: ${row.rootsToCreate.join(", ") || "none"}`);
      for (const blocker of row.blockers) {
        console.log(`  blocker: ${blocker}`);
      }
    }
  }

  if (!options.apply) {
    return;
  }
  if (blockerCount > 0) {
    throw new Error(`Refusing to apply with ${blockerCount} blocker(s). Fix the audit input and rerun.`);
  }

  for (const row of auditRows) {
    for (const annonceurPublisherId of row.rootsToCreate) {
      await publisherDiffusionRuleService.findOrCreateScopeRoot(row.diffuserId, annonceurPublisherId);
      console.log(`[${SCRIPT_NAME}] Created scope root ${row.diffuserId} -> ${annonceurPublisherId}`);
    }
  }
}

main()
  .catch((error) => {
    console.error(`[${SCRIPT_NAME}] Failed`, error);
    process.exitCode = 1;
  })
  .finally(async () => {
    const { prisma } = await import("@/db/postgres");
    await prisma.$disconnect();
  });
