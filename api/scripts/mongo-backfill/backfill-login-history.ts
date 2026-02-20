import { loginHistoryRepository } from "@/repositories/login-history";
import { pgConnected, prismaCore } from "@/db/postgres";
import { compareDates } from "./utils/compare";
import { normalizeDate } from "./utils/normalize";
import { loadEnvironment, parseScriptOptions } from "./utils/options";

type UserWithLegacyLogins = {
  id: string;
  loginAt: Array<Date | string | null> | null;
};

const BATCH_SIZE = 100;
const options = parseScriptOptions(process.argv.slice(2), "BackfillLoginHistory");
loadEnvironment(options, __dirname, "BackfillLoginHistory");

const toLoginHistory = (values: UserWithLegacyLogins["loginAt"]): Date[] => {
  if (!Array.isArray(values)) {
    return [];
  }
  const normalized: Date[] = [];
  for (const value of values) {
    const date = normalizeDate(value as Date | string | null);
    if (date) {
      normalized.push(date);
    }
  }
  return normalized.sort((a, b) => a.getTime() - b.getTime());
};

const compareDateArrays = (a: Date[], b: Date[]) => {
  if (a.length !== b.length) {
    return false;
  }
  for (let i = 0; i < a.length; i++) {
    if (!compareDates(a[i], b[i])) {
      return false;
    }
  }
  return true;
};

const formatLogins = (logins: Date[]) => logins.map((date) => date.toISOString());

const replaceLoginHistory = async (userId: string, logins: Date[]) => {
  await loginHistoryRepository.deleteMany({ where: { userId } });
  if (!logins.length) {
    return;
  }

  await loginHistoryRepository.createMany({
    data: logins.map((loginAt) => ({
      userId,
      loginAt,
    })),
    skipDuplicates: true,
  });
};

const cleanup = async () => {
  await Promise.allSettled([prismaCore.$disconnect()]);
};

const main = async () => {
  console.log(`[BackfillLoginHistory] Starting${options.dryRun ? " (dry-run)" : ""}`);
  await pgConnected;

  const stats = { created: 0, updated: 0, deleted: 0, unchanged: 0 };
  const sampleChanges: { userId: string; type: "created" | "updated" | "deleted"; before: string[]; after: string[] }[] = [];
  let processed = 0;

  const fetchBatch = async (cursor?: string) => {
    return prismaCore.user.findMany({
      orderBy: { id: "asc" },
      take: BATCH_SIZE,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      select: { id: true, loginAt: true },
    });
  };

  let cursor: string | undefined;
  while (true) {
    const users = (await fetchBatch(cursor)) as UserWithLegacyLogins[];
    if (!users.length) {
      break;
    }

    cursor = users[users.length - 1].id;
    processed += users.length;

    const entries = users.map((user) => ({
      userId: user.id,
      logins: toLoginHistory(user.loginAt),
    }));

    const ids = entries.map((entry) => entry.userId);
    const existingHistory = await loginHistoryRepository.findMany({
      where: { userId: { in: ids } },
      orderBy: [{ userId: "asc" }, { loginAt: "asc" }],
    });
    const existingByUser = new Map<string, Date[]>();
    for (const history of existingHistory) {
      const values = existingByUser.get(history.userId);
      if (values) {
        values.push(history.loginAt);
      } else {
        existingByUser.set(history.userId, [history.loginAt]);
      }
    }

    for (const entry of entries) {
      const existingLogins = existingByUser.get(entry.userId) ?? [];
      if (compareDateArrays(existingLogins, entry.logins)) {
        stats.unchanged += 1;
        continue;
      }

      const changeType: "created" | "updated" | "deleted" =
        existingLogins.length === 0 && entry.logins.length > 0
          ? "created"
          : existingLogins.length > 0 && entry.logins.length === 0
            ? "deleted"
            : "updated";

      if (options.dryRun) {
        if (sampleChanges.length < 5) {
          sampleChanges.push({
            userId: entry.userId,
            type: changeType,
            before: formatLogins(existingLogins),
            after: formatLogins(entry.logins),
          });
        }
      } else {
        await replaceLoginHistory(entry.userId, entry.logins);
      }

      stats[changeType] += 1;
    }
  }

  if (options.dryRun) {
    console.log(
      `[BackfillLoginHistory][Dry-run] Processed ${processed} user(s) -> would create ${stats.created}, update ${stats.updated}, delete ${stats.deleted}, skip ${stats.unchanged}`
    );
    if (sampleChanges.length) {
      console.log("[BackfillLoginHistory][Dry-run] Sample changes:");
      for (const sample of sampleChanges) {
        console.log(
          `[${sample.type}] user=${sample.userId} before=${JSON.stringify(sample.before)} after=${JSON.stringify(sample.after)}`
        );
      }
    }
  } else {
    console.log(
      `[BackfillLoginHistory] Processed ${processed} user(s) -> created ${stats.created}, updated ${stats.updated}, deleted ${stats.deleted}, unchanged ${stats.unchanged}`
    );
  }
};

const run = async () => {
  try {
    await main();
    await cleanup();
    process.exit(0);
  } catch (error) {
    console.error("[BackfillLoginHistory] Unexpected error:", error);
    await cleanup();
    process.exit(1);
  }
};

run();
