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

type AuditReason = "api_without_roots";

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

  const [apiDiffusers, rules] = await Promise.all([
    prisma.publisher.findMany({
      where: {
        deletedAt: null,
        hasApiRights: true,
      },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.publisherDiffusionRule.findMany({
      select: { publisherId: true, combinedWithId: true, field: true, operator: true, value: true },
    }),
  ]);

  const rootsByPublisherId = new Map<string, string[]>();
  const desiredRootsByPublisherId = new Map<string, Set<string>>();

  for (const rule of rules) {
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

  for (const [diffuserId, publisherIds] of options.apiAllowlists) {
    addDesiredRoots(desiredRootsByPublisherId, diffuserId, publisherIds);
  }

  const auditRows: AuditRow[] = apiDiffusers
    .filter((diffuser) => (rootsByPublisherId.get(diffuser.id) ?? []).length === 0)
    .map((diffuser) => {
      const existingRoots = Array.from(new Set(rootsByPublisherId.get(diffuser.id) ?? [])).sort();
      const desiredRoots = Array.from(desiredRootsByPublisherId.get(diffuser.id) ?? []).sort();
      const existing = new Set(existingRoots);
      const rootsToCreate = desiredRoots.filter((publisherId) => !existing.has(publisherId));
      const blockers = options.apiAllowlists.has(diffuser.id) ? [] : ["API diffuser without explicit --api-allowlist"];

      return {
        diffuserId: diffuser.id,
        diffuserName: diffuser.name,
        reasons: ["api_without_roots"] satisfies AuditReason[],
        existingRoots,
        rootsToCreate,
        blockers,
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
