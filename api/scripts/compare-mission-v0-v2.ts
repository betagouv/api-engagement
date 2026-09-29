import dotenv from "dotenv";

dotenv.config();

type Options = {
  publisherId: string;
  baseUrl: URL;
  pageSize: number;
  delayMs: number;
  maxMissions: number;
  offset?: number;
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

const DEFAULTS = { pageSize: 20, delayMs: 250, maxMissions: 10000 };
const sleep: Pause = (delayMs) => new Promise((resolve) => setTimeout(resolve, delayMs));
const ignoreRequestTiming: LogRequestTiming = () => {};

const parseInteger = (value: string | number, name: string, minimum: number, maximum: number): number => {
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number < minimum || number > maximum) {
    throw new Error(`${name} doit être un entier entre ${minimum} et ${maximum}`);
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

  const allowed = new Set(["--publisher-id", "--base-url", "--page-size", "--delay-ms", "--max-missions", "--offset"]);
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

  return {
    publisherId,
    baseUrl,
    pageSize: parseInteger(values.get("--page-size") ?? DEFAULTS.pageSize, "--page-size", 1, 100),
    delayMs: parseInteger(values.get("--delay-ms") ?? DEFAULTS.delayMs, "--delay-ms", 0, 60000),
    maxMissions: parseInteger(values.get("--max-missions") ?? DEFAULTS.maxMissions, "--max-missions", 1, 1000000),
    offset: values.has("--offset") ? parseInteger(values.get("--offset")!, "--offset", 0, 1000000000) : undefined,
  };
};

function assertMission(mission: unknown, version: string, publisherId: string): asserts mission is MissionIdentity {
  const candidate = mission as Partial<MissionIdentity> | null;
  if (!candidate || typeof candidate.id !== "string" || !candidate.id || typeof candidate.clientId !== "string" || !candidate.clientId || candidate.publisherId !== publisherId) {
    throw new Error(`Réponse ${version} invalide ou mission hors du publisher demandé`);
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
  url.searchParams.set("publisher", options.publisherId);
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

const collectV2 = async (options: AuthenticatedOptions, fetchImpl: Fetch, pause: Pause, logRequestTiming: LogRequestTiming): Promise<{ ids: Set<string>; pages: number }> => {
  const ids = new Set<string>();
  const cursors = new Set<string>();
  let cursor: string | undefined;
  let pages = 0;

  while (true) {
    const page = await requestPage(options, 2, { limit: options.pageSize, cursor }, fetchImpl, logRequestTiming);
    pages += 1;
    if (typeof page.hasMore !== "boolean" || page.data.length > options.pageSize) {
      throw new Error("Pagination v2 invalide");
    }
    for (const mission of page.data) {
      assertMission(mission, "v2", options.publisherId);
      if (ids.has(mission.id)) {
        throw new Error("Doublon d'identifiant dans la v2");
      }
      ids.add(mission.id);
    }
    if (ids.size > options.maxMissions) {
      throw new Error(`Comparaison interrompue : plus de ${options.maxMissions} missions en v2 (--max-missions)`);
    }
    if (!page.hasMore) {
      if (page.nextCursor !== null) {
        throw new Error("Pagination v2 invalide : nextCursor attendu à null en fin de liste");
      }
      return { ids, pages };
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
    if (expectedTotal === undefined) {
      expectedTotal = page.total;
    } else if (page.total !== expectedTotal) {
      throw new Error("Le total v0 a changé pendant le parcours");
    }

    for (const mission of page.data) {
      assertMission(mission, "v0", options.publisherId);
      if (ids.has(mission.id)) {
        throw new Error("Doublon d'identifiant dans la v0");
      }
      ids.add(mission.id);
    }
    if (ids.size > options.maxMissions || expectedTotal > options.maxMissions) {
      throw new Error(`Comparaison interrompue : plus de ${options.maxMissions} missions en v0 (--max-missions)`);
    }
    if (ids.size === expectedTotal) {
      return { ids, pages, total: expectedTotal };
    }
    if (page.data.length !== options.pageSize || ids.size > expectedTotal) {
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
    same: v0.total === v2.ids.size && onlyV2.length === 0 && onlyV0.length === 0,
    publisherId: options.publisherId,
    v0Total: v0.total,
    v2Total: v2.ids.size,
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
    const result = await compareMissions({ ...options, apiKey: publisher.apikey }, fetch, sleep, ({ version, status, durationMs, limit, offset }) => {
      responseTimes[version].push(durationMs);
      const pagination = [`limit=${limit ?? "?"}`, ...(offset === undefined ? [] : [`offset=${offset}`])].join(" — ");
      console.log(`GET /v${version}/mission — ${pagination} — HTTP ${status} — ${durationMs.toFixed(0)} ms`);
    });
    console.log(`Publisher ${result.publisherId} : v0=${result.v0Total}, v2=${result.v2Total}, ${result.v0Pages} page(s) v0, ${result.v2Pages} page(s) v2`);
    for (const version of [0, 2] as const) {
      const durations = responseTimes[version];
      const total = durations.reduce((sum, duration) => sum + duration, 0);
      const average = durations.length ? total / durations.length : 0;
      const maximum = durations.length ? Math.max(...durations) : 0;
      console.log(
        `Résumé GET /v${version}/mission — ${durations.length} requête(s) — total ${total.toFixed(0)} ms — moyenne ${average.toFixed(0)} ms — max ${maximum.toFixed(0)} ms`
      );
    }
    console.log(result.same ? "Identiques : mêmes identifiants de missions" : "Différence : ensembles de missions distincts");
    if (!result.same) {
      console.log(`Présentes uniquement en v2 (${result.onlyV2.length}) : ${result.onlyV2.slice(0, 20).join(", ") || "aucune"}`);
      console.log(`Présentes uniquement en v0 (${result.onlyV0.length}) : ${result.onlyV0.slice(0, 20).join(", ") || "aucune"}`);
      process.exitCode = 1;
    }
  } finally {
    await pgDisconnect();
  }
};

if (require.main === module) {
  main().catch((error) => {
    console.error(`Comparaison impossible : ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 2;
  });
}
