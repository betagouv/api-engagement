import dotenv from "dotenv";
dotenv.config();

type Options = {
  publisherId: string;
  baseUrl: URL;
  pageSize: number;
  delayMs: number;
  concurrency: number;
  offset?: number;
  version?: 0 | 2;
};

type AuthenticatedOptions = Options & { apiKey: string };

type MissionIdentity = { id: string; clientId: string; publisherId: string };
type ApiPage = { ok: true; data: MissionIdentity[]; total?: number; hasMore?: boolean; nextCursor?: string | null };
type Fetch = typeof fetch;
type Pause = (delayMs: number) => Promise<void>;
type RequestTiming = { version: 0 | 2; status: number; durationMs: number; limit?: number; offset?: number };
type LogRequestTiming = (timing: RequestTiming) => void;

export type ComparisonResult = {
  same: boolean;
  publisherId: string;
  v0Total: number;
  v2Total: number;
  v2Pages: number;
  v0Pages: number;
  onlyV2: string[];
  onlyV0: string[];
};

const DEFAULTS = { pageSize: 20, delayMs: 0, concurrency: 1 };
const sleep: Pause = (delayMs) => new Promise((resolve) => setTimeout(resolve, delayMs));
const ignoreRequestTiming: LogRequestTiming = () => {};

const parseInteger = (value: string | number, name: string, minimum: number, maximum?: number): number => {
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number < minimum || (maximum !== undefined && number > maximum)) {
    const range = maximum === undefined ? `supérieur ou égal à ${minimum}` : `entre ${minimum} et ${maximum}`;
    throw new Error(`${name} doit être un entier ${range}`);
  }
  return number;
};

export const parseOptions = (args: string[], env: NodeJS.ProcessEnv): Options => {
  const values = new Map<string, string>();
  for (let index = 0; index < args.length; index += 2) {
    const name = args[index];
    const value = args[index + 1];
    if (!name?.startsWith("--") || value === undefined || values.has(name)) {
      throw new Error(`Option invalide ou répétée : ${name ?? "absente"}`);
    }
    values.set(name, value);
  }

  const allowed = new Set(["--publisher-id", "--base-url", "--page-size", "--delay-ms", "--concurrency", "--offset", "--version"]);
  for (const name of values.keys()) {
    if (!allowed.has(name)) {
      throw new Error(`Option inconnue : ${name}`);
    }
  }

  const publisherId = values.get("--publisher-id");
  const rawBaseUrl = values.get("--base-url") ?? env.API_ENGAGEMENT_BASE_URL;
  if (!publisherId || !rawBaseUrl) {
    throw new Error("--publisher-id et --base-url (ou API_ENGAGEMENT_BASE_URL) sont requis");
  }

  const baseUrl = new URL(rawBaseUrl);
  if (!["http:", "https:"].includes(baseUrl.protocol) || baseUrl.username || baseUrl.password || baseUrl.search || baseUrl.hash) {
    throw new Error("--base-url doit être une URL HTTP(S) sans identifiants, paramètres ni fragment");
  }
  baseUrl.pathname = `${baseUrl.pathname.replace(/\/$/, "")}/`;

  const rawVersion = values.get("--version");
  if (rawVersion !== undefined && rawVersion !== "v0" && rawVersion !== "v2") {
    throw new Error("--version doit valoir v0 ou v2");
  }
  const version = rawVersion === "v0" ? 0 : rawVersion === "v2" ? 2 : undefined;
  const offset = values.has("--offset") ? parseInteger(values.get("--offset")!, "--offset", 0, 1000000000) : undefined;
  if (version === 2 && offset !== undefined) {
    throw new Error("--offset est uniquement disponible pour la v0");
  }

  return {
    publisherId,
    baseUrl,
    pageSize: parseInteger(values.get("--page-size") ?? DEFAULTS.pageSize, "--page-size", 1),
    delayMs: parseInteger(values.get("--delay-ms") ?? DEFAULTS.delayMs, "--delay-ms", 0, 60000),
    concurrency: parseInteger(values.get("--concurrency") ?? DEFAULTS.concurrency, "--concurrency", 1),
    offset,
    version,
  };
};

const runConcurrently = <T>(concurrency: number, run: (workerIndex: number) => Promise<T>): Promise<T[]> =>
  Promise.all(Array.from({ length: concurrency }, (_, workerIndex) => run(workerIndex)));

function assertMission(mission: unknown, version: string): asserts mission is MissionIdentity {
  const candidate = mission as Partial<MissionIdentity> | null;
  if (
    !candidate ||
    typeof candidate.id !== "string" ||
    !candidate.id ||
    typeof candidate.clientId !== "string" ||
    !candidate.clientId ||
    typeof candidate.publisherId !== "string"
  ) {
    throw new Error(`Réponse ${version} invalide`);
  }
}

const requestPage = async (
  options: AuthenticatedOptions,
  version: 0 | 2,
  parameters: Record<string, string | number | string[] | undefined>,
  fetchImpl: Fetch,
  logRequestTiming: LogRequestTiming
): Promise<ApiPage> => {
  const url = new URL(`v${version}/mission`, options.baseUrl);
  for (const [name, value] of Object.entries(parameters)) {
    if (Array.isArray(value)) {
      for (const item of value) {
        url.searchParams.append(name, item);
      }
    } else if (value !== undefined) {
      url.searchParams.set(name, String(value));
    }
  }

  const requestDetails = {
    version,
    limit: typeof parameters.limit === "number" ? parameters.limit : undefined,
    offset: typeof parameters.skip === "number" ? parameters.skip : undefined,
  };
  const startedAt = performance.now();
  const response = await fetchImpl(url, { headers: { "x-api-key": options.apiKey }, signal: AbortSignal.timeout(30000) });
  if (!response.ok) {
    logRequestTiming({ ...requestDetails, status: response.status, durationMs: performance.now() - startedAt });
    throw new Error(`GET /v${version}/mission : HTTP ${response.status}`);
  }
  const payload = (await response.json()) as Partial<ApiPage> | null;
  logRequestTiming({ ...requestDetails, status: response.status, durationMs: performance.now() - startedAt });
  if (!payload || payload.ok !== true || !Array.isArray(payload.data)) {
    throw new Error(`Réponse v${version} invalide`);
  }
  return payload as ApiPage;
};

const collectV2 = async (
  options: AuthenticatedOptions,
  fetchImpl: Fetch,
  pause: Pause,
  logRequestTiming: LogRequestTiming
): Promise<{ ids: Set<string>; pages: number; total: number }> => {
  const ids = new Set<string>();
  const cursors = new Set<string>();
  let cursor: string | undefined;
  let pages = 0;
  let expectedTotal: number | undefined;

  while (true) {
    const page = await requestPage(options, 2, { limit: options.pageSize, cursor }, fetchImpl, logRequestTiming);
    pages += 1;
    if (typeof page.hasMore !== "boolean" || !Number.isSafeInteger(page.total) || (page.total ?? -1) < 0 || page.data.length > options.pageSize) {
      throw new Error("Pagination v2 invalide");
    }
    const pageTotal = page.total as number;
    if (expectedTotal === undefined) {
      expectedTotal = pageTotal;
    } else if (pageTotal !== expectedTotal) {
      throw new Error("Le total v2 a changé pendant le parcours");
    }
    for (const mission of page.data) {
      assertMission(mission, "v2");
      if (ids.has(mission.id)) {
        throw new Error("Doublon d'identifiant dans la v2");
      }
      ids.add(mission.id);
    }
    if (!page.hasMore) {
      if (page.nextCursor !== null) {
        throw new Error("Pagination v2 invalide : nextCursor attendu à null en fin de liste");
      }
      if (ids.size !== expectedTotal) {
        throw new Error("Pagination v2 incomplète ou incohérente");
      }
      return { ids, pages, total: expectedTotal };
    }
    if (!page.data.length || typeof page.nextCursor !== "string" || !page.nextCursor || cursors.has(page.nextCursor)) {
      throw new Error("Pagination v2 invalide : curseur absent ou répété");
    }
    cursor = page.nextCursor;
    cursors.add(cursor);
    await pause(options.delayMs);
  }
};

const collectV0 = async (
  options: AuthenticatedOptions,
  fetchImpl: Fetch,
  pause: Pause,
  logRequestTiming: LogRequestTiming
): Promise<{ ids: Set<string>; pages: number; total: number }> => {
  const ids = new Set<string>();
  let offset = 0;
  let pages = 0;
  let expectedTotal: number | undefined;

  while (true) {
    const page = await requestPage(options, 0, { limit: options.pageSize, skip: offset }, fetchImpl, logRequestTiming);
    pages += 1;
    if (!Number.isSafeInteger(page.total) || (page.total ?? -1) < 0 || page.data.length > options.pageSize) {
      throw new Error("Pagination v0 invalide");
    }
    const pageTotal = page.total as number;
    if (expectedTotal === undefined) {
      expectedTotal = pageTotal;
    } else if (pageTotal !== expectedTotal) {
      throw new Error("Le total v0 a changé pendant le parcours");
    }
    const total = expectedTotal ?? pageTotal;

    for (const mission of page.data) {
      assertMission(mission, "v0");
      if (ids.has(mission.id)) {
        throw new Error("Doublon d'identifiant dans la v0");
      }
      ids.add(mission.id);
    }
    if (ids.size === total) {
      return { ids, pages, total };
    }
    if (page.data.length !== options.pageSize || ids.size > total) {
      throw new Error("Pagination v0 incomplète ou incohérente");
    }

    offset += options.pageSize;
    await pause(options.delayMs);
  }
};

export const compareMissions = async (
  options: AuthenticatedOptions,
  fetchImpl: Fetch = fetch,
  pause: Pause = sleep,
  logRequestTiming: LogRequestTiming = ignoreRequestTiming
): Promise<ComparisonResult> => {
  const v2 = await collectV2(options, fetchImpl, pause, logRequestTiming);
  await pause(options.delayMs);

  // Sonde facultative pour mesurer directement un offset précis avant le parcours complet.
  if (options.offset !== undefined) {
    await requestPage(options, 0, { limit: options.pageSize, skip: options.offset }, fetchImpl, logRequestTiming);
    await pause(options.delayMs);
  }
  const v0 = await collectV0(options, fetchImpl, pause, logRequestTiming);

  const onlyV2 = [...v2.ids].filter((id) => !v0.ids.has(id));
  const onlyV0 = [...v0.ids].filter((id) => !v2.ids.has(id));

  return {
    same: v0.total === v2.total && onlyV2.length === 0 && onlyV0.length === 0,
    publisherId: options.publisherId,
    v0Total: v0.total,
    v2Total: v2.total,
    v2Pages: v2.pages,
    v0Pages: v0.pages,
    onlyV2,
    onlyV0,
  };
};

const main = async () => {
  const options = parseOptions(process.argv.slice(2), process.env);
  const { pgDisconnect, prisma } = await import("@/db/postgres");

  try {
    const publisher = await prisma.publisher.findFirst({
      where: { id: options.publisherId, deletedAt: null },
      select: { apikey: true },
    });

    if (!publisher) {
      throw new Error(`Publisher introuvable en base : ${options.publisherId}`);
    }

    if (!publisher.apikey) {
      throw new Error(`Le publisher ${options.publisherId} ne possède pas de clé API`);
    }

    const responseTimes: Record<0 | 2, number[]> = { 0: [], 2: [] };
    const authenticatedOptions = { ...options, apiKey: publisher.apikey };
    const benchmarkStartedAt = performance.now();
    const createLogRequestTiming =
      (workerIndex: number): LogRequestTiming =>
      ({ version, status, durationMs, limit, offset }) => {
        responseTimes[version].push(durationMs);
        const worker = options.concurrency > 1 ? `Worker ${workerIndex + 1}/${options.concurrency} — ` : "";
        const pagination = [`limit=${limit ?? "?"}`, ...(offset === undefined ? [] : [`offset=${offset}`])].join(" — ");
        console.log(`${worker}GET /v${version}/mission — ${pagination} — HTTP ${status} — ${durationMs.toFixed(0)} ms`);
      };

    let results: ComparisonResult[] | undefined;
    if (options.version === 0) {
      const runs = await runConcurrently(options.concurrency, async (workerIndex) => {
        const logRequestTiming = createLogRequestTiming(workerIndex);
        if (options.offset !== undefined) {
          await requestPage(authenticatedOptions, 0, { limit: options.pageSize, skip: options.offset }, fetch, logRequestTiming);
          await sleep(options.delayMs);
        }
        return collectV0(authenticatedOptions, fetch, sleep, logRequestTiming);
      });
      const v0 = runs[0];
      console.log(`Publisher ${options.publisherId} : v0=${v0.total}, ${v0.pages} page(s) par parcours, ${runs.length} parcours`);
    } else if (options.version === 2) {
      const runs = await runConcurrently(options.concurrency, (workerIndex) => collectV2(authenticatedOptions, fetch, sleep, createLogRequestTiming(workerIndex)));
      const v2 = runs[0];
      console.log(`Publisher ${options.publisherId} : v2=${v2.total}, ${v2.pages} page(s) par parcours, ${runs.length} parcours`);
    } else {
      results = await runConcurrently(options.concurrency, (workerIndex) => compareMissions(authenticatedOptions, fetch, sleep, createLogRequestTiming(workerIndex)));
      const result = results[0];
      console.log(
        `Publisher ${result.publisherId} : v0=${result.v0Total}, v2=${result.v2Total}, ${result.v0Pages} page(s) v0 et ${result.v2Pages} page(s) v2 par parcours, ${results.length} parcours`
      );
    }

    const benchmarkedVersions: Array<0 | 2> = options.version === undefined ? [0, 2] : [options.version];
    for (const version of benchmarkedVersions) {
      const durations = responseTimes[version];
      const total = durations.reduce((sum, duration) => sum + duration, 0);
      const average = durations.length ? total / durations.length : 0;
      const maximum = durations.length ? Math.max(...durations) : 0;
      console.log(
        `Résumé GET /v${version}/mission — ${durations.length} requête(s) — total ${total.toFixed(0)} ms — moyenne ${average.toFixed(0)} ms — max ${maximum.toFixed(0)} ms`
      );
    }

    const wallDurationMs = performance.now() - benchmarkStartedAt;
    const requestCount = responseTimes[0].length + responseTimes[2].length;
    const requestsPerSecond = wallDurationMs > 0 ? requestCount / (wallDurationMs / 1000) : 0;
    console.log(`Résumé charge — concurrence ${options.concurrency} — durée réelle ${wallDurationMs.toFixed(0)} ms — débit moyen ${requestsPerSecond.toFixed(2)} req/s`);

    if (results) {
      const result = results.find((candidate) => !candidate.same) ?? results[0];
      const identical = results.every((candidate) => candidate.same);
      console.log(identical ? "Identiques : mêmes identifiants de missions pour tous les parcours" : "Différence : ensembles de missions distincts");
      if (!identical) {
        console.log(`Présentes uniquement en v2 (${result.onlyV2.length}) : ${result.onlyV2.slice(0, 20).join(", ") || "aucune"}`);
        console.log(`Présentes uniquement en v0 (${result.onlyV0.length}) : ${result.onlyV0.slice(0, 20).join(", ") || "aucune"}`);
        process.exitCode = 1;
      }
    }
  } finally {
    await pgDisconnect();
  }
};

main().catch((error) => {
  console.error(`Comparaison impossible : ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 2;
});
