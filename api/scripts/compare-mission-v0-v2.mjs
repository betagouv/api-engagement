import { pathToFileURL } from "node:url";

const DEFAULTS = {
  pageSize: 100,
  batchSize: 25,
  delayMs: 250,
  maxMissions: 10000,
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const parseInteger = (value, name, minimum, maximum) => {
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number < minimum || number > maximum) {
    throw new Error(`${name} doit être un entier entre ${minimum} et ${maximum}`);
  }
  return number;
};

export const parseOptions = (args, env) => {
  const values = new Map();
  for (let index = 0; index < args.length; index += 2) {
    const name = args[index];
    const value = args[index + 1];
    if (!name?.startsWith("--") || value === undefined || values.has(name)) {
      throw new Error(`Option invalide ou répétée : ${name ?? "absente"}`);
    }
    values.set(name, value);
  }

  const allowed = new Set(["--publisher-id", "--base-url", "--page-size", "--batch-size", "--delay-ms", "--max-missions"]);
  for (const name of values.keys()) {
    if (!allowed.has(name)) {
      throw new Error(`Option inconnue : ${name}`);
    }
  }

  const publisherId = values.get("--publisher-id");
  const apiKey = env.API_ENGAGEMENT_API_KEY;
  const rawBaseUrl = values.get("--base-url") ?? env.API_ENGAGEMENT_BASE_URL;
  if (!publisherId || !apiKey || !rawBaseUrl) {
    throw new Error("--publisher-id, --base-url (ou API_ENGAGEMENT_BASE_URL) et API_ENGAGEMENT_API_KEY sont requis");
  }

  const baseUrl = new URL(rawBaseUrl);
  if (!["http:", "https:"].includes(baseUrl.protocol) || baseUrl.username || baseUrl.password || baseUrl.search || baseUrl.hash) {
    throw new Error("--base-url doit être une URL HTTP(S) sans identifiants, paramètres ni fragment");
  }
  baseUrl.pathname = `${baseUrl.pathname.replace(/\/$/, "")}/`;

  return {
    publisherId,
    apiKey,
    baseUrl,
    pageSize: parseInteger(values.get("--page-size") ?? DEFAULTS.pageSize, "--page-size", 1, 100),
    batchSize: parseInteger(values.get("--batch-size") ?? DEFAULTS.batchSize, "--batch-size", 1, 100),
    delayMs: parseInteger(values.get("--delay-ms") ?? DEFAULTS.delayMs, "--delay-ms", 0, 60000),
    maxMissions: parseInteger(values.get("--max-missions") ?? DEFAULTS.maxMissions, "--max-missions", 1, 1000000),
  };
};

const assertMission = (mission, version, publisherId) => {
  if (!mission || typeof mission.id !== "string" || !mission.id || typeof mission.clientId !== "string" || !mission.clientId || mission.publisherId !== publisherId) {
    throw new Error(`Réponse ${version} invalide ou mission hors du publisher demandé`);
  }
};

const requestPage = async (options, version, parameters, fetchImpl) => {
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

  const response = await fetchImpl(url, { headers: { "x-api-key": options.apiKey }, signal: AbortSignal.timeout(30000) });
  if (!response.ok) {
    throw new Error(`GET /v${version}/mission : HTTP ${response.status}`);
  }
  const payload = await response.json();
  if (!payload || payload.ok !== true || !Array.isArray(payload.data)) {
    throw new Error(`Réponse v${version} invalide`);
  }
  return payload;
};

const collectV2 = async (options, fetchImpl, pause) => {
  const byClientId = new Map();
  const ids = new Set();
  const cursors = new Set();
  let cursor;
  let pages = 0;

  while (true) {
    const page = await requestPage(options, 2, { limit: options.pageSize, cursor }, fetchImpl);
    pages += 1;
    if (typeof page.hasMore !== "boolean" || page.data.length > options.pageSize) {
      throw new Error("Pagination v2 invalide");
    }
    for (const mission of page.data) {
      assertMission(mission, "v2", options.publisherId);
      if (ids.has(mission.id) || byClientId.has(mission.clientId)) {
        throw new Error("Doublon d'identifiant ou de clientId dans la v2");
      }
      ids.add(mission.id);
      byClientId.set(mission.clientId, mission.id);
    }
    if (ids.size > options.maxMissions) {
      throw new Error(`Comparaison interrompue : plus de ${options.maxMissions} missions en v2 (--max-missions)`);
    }
    if (!page.hasMore) {
      if (page.nextCursor !== null) {
        throw new Error("Pagination v2 invalide : nextCursor attendu à null en fin de liste");
      }
      return { byClientId, ids, pages };
    }
    if (!page.data.length || typeof page.nextCursor !== "string" || !page.nextCursor || cursors.has(page.nextCursor)) {
      throw new Error("Pagination v2 invalide : curseur absent ou répété");
    }
    cursor = page.nextCursor;
    cursors.add(cursor);
    await pause(options.delayMs);
  }
};

export const compareMissions = async (options, fetchImpl = fetch, pause = sleep) => {
  const v2 = await collectV2(options, fetchImpl, pause);
  await pause(options.delayMs);

  // Un seul COUNT global v0. Les autres lectures v0 ciblent les clientId de la v2
  // et restent à skip=0 : aucune page profonde n'est demandée à la base core.
  const firstV0 = await requestPage(options, 0, { limit: 1, skip: 0 }, fetchImpl);
  if (!Number.isSafeInteger(firstV0.total) || firstV0.total < 0) {
    throw new Error("Total v0 invalide");
  }
  const v0Total = firstV0.total;
  const v0Ids = new Set();
  const entries = [...v2.byClientId.entries()];
  let batches = 0;

  for (let index = 0; index < entries.length; index += options.batchSize) {
    await pause(options.delayMs);
    const batch = entries.slice(index, index + options.batchSize);
    const clientIds = batch.map(([clientId]) => clientId);
    const page = await requestPage(options, 0, { clientId: clientIds, limit: batch.length, skip: 0 }, fetchImpl);
    batches += 1;
    if (!Number.isSafeInteger(page.total) || page.total !== page.data.length || page.data.length > batch.length) {
      throw new Error("Lot v0 incomplet ou total incohérent : comparaison impossible");
    }
    const requested = new Set(clientIds);
    for (const mission of page.data) {
      assertMission(mission, "v0", options.publisherId);
      if (!requested.has(mission.clientId) || v0Ids.has(mission.id)) {
        throw new Error("Lot v0 inattendu ou identifiant dupliqué");
      }
      v0Ids.add(mission.id);
    }
  }

  const onlyV2 = [...v2.ids].filter((id) => !v0Ids.has(id));
  const onlyV0Found = [...v0Ids].filter((id) => !v2.ids.has(id));
  const onlyV0Unknown = v0Total - v0Ids.size;
  if (onlyV0Unknown < 0) {
    throw new Error("Le total v0 a changé pendant la comparaison : relancer sur un jeu de données stable");
  }

  return {
    same: v0Total === v2.ids.size && onlyV2.length === 0 && onlyV0Found.length === 0 && onlyV0Unknown === 0,
    publisherId: options.publisherId,
    v0Total,
    v2Total: v2.ids.size,
    v2Pages: v2.pages,
    v0Batches: batches,
    onlyV2,
    onlyV0Found,
    onlyV0Unknown,
  };
};

const main = async () => {
  const options = parseOptions(process.argv.slice(2), process.env);
  const result = await compareMissions(options);
  console.log(`Publisher ${result.publisherId} : v0=${result.v0Total}, v2=${result.v2Total}, ${result.v2Pages} page(s) v2, ${result.v0Batches} lot(s) v0`);
  console.log(result.same ? "Identiques : mêmes identifiants de missions" : "Différence : ensembles de missions distincts");
  if (!result.same) {
    console.log(`Présentes uniquement en v2 (${result.onlyV2.length}) : ${result.onlyV2.slice(0, 20).join(", ") || "aucune"}`);
    console.log(`Identifiées uniquement en v0 (${result.onlyV0Found.length}) : ${result.onlyV0Found.slice(0, 20).join(", ") || "aucune"}`);
    console.log(`Autres missions v0 non identifiées sans pagination à grand offset : ${result.onlyV0Unknown}`);
    process.exitCode = 1;
  }
};

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(`Comparaison impossible : ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 2;
  });
}
