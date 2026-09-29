import assert from "node:assert/strict";
import { test } from "node:test";

import { compareMissions, parseOptions } from "../compare-mission-v0-v2";

const options = (additionalArguments: string[] = []) => ({
  ...parseOptions(["--publisher-id", "publisher-1", "--base-url", "https://example.test", "--page-size", "1", "--delay-ms", "0", ...additionalArguments], {}),
  apiKey: "secret-test",
});

const mission = (id: string, clientId: string) => ({ id, clientId, publisherId: "publisher-1" });
const json = (body: object) => new Response(JSON.stringify({ ok: true, ...body }), { status: 200, headers: { "content-type": "application/json" } });

test("parcourt intégralement les deux endpoints et compare les ensembles indépendamment de leur ordre", async () => {
  const calls: Array<{ path: string; query: URLSearchParams; apiKey: string }> = [];
  const timings: Array<{ version: 0 | 2; status: number; durationMs: number }> = [];
  const fetchImpl: typeof fetch = async (input, init) => {
    const url = input as URL;
    const query = url.searchParams;
    calls.push({ path: url.pathname, query: new URLSearchParams(query), apiKey: (init?.headers as Record<string, string>)["x-api-key"] });
    if (url.pathname === "/v2/mission" && !query.has("cursor")) {
      return json({ data: [mission("id-1", "client-1")], hasMore: true, nextCursor: "id-1" });
    }
    if (url.pathname === "/v2/mission") {
      return json({ data: [mission("id-2", "client-2")], hasMore: false, nextCursor: null });
    }
    return query.get("skip") === "0" ? json({ data: [mission("id-2", "client-2")], total: 2 }) : json({ data: [mission("id-1", "client-1")], total: 2 });
  };

  const result = await compareMissions(
    options(),
    fetchImpl,
    async () => {},
    (timing) => timings.push(timing)
  );

  assert.equal(result.same, true);
  assert.equal(result.v0Total, 2);
  assert.equal(result.v2Total, 2);
  assert.equal(result.v0Pages, 2);
  assert.deepEqual(
    calls.filter((call) => call.path === "/v0/mission").map((call) => call.query.get("skip")),
    ["0", "1"]
  );
  assert.ok(calls.every((call) => call.apiKey === "secret-test" && call.query.get("publisher") === "publisher-1"));
  assert.deepEqual(
    timings.map(({ version, status }) => ({ version, status })),
    [
      { version: 2, status: 200 },
      { version: 2, status: 200 },
      { version: 0, status: 200 },
      { version: 0, status: 200 },
    ]
  );
  assert.ok(timings.every(({ durationMs }) => Number.isFinite(durationMs) && durationMs >= 0));
});

test("détecte une mission uniquement en v0 pendant le parcours complet", async () => {
  const fetchImpl: typeof fetch = async (input) => {
    const url = input as URL;
    if (url.pathname === "/v2/mission") {
      return json({ data: [mission("id-1", "client-1")], hasMore: false, nextCursor: null });
    }
    return url.searchParams.get("skip") === "0" ? json({ data: [mission("id-1", "client-1")], total: 2 }) : json({ data: [mission("id-2", "client-2")], total: 2 });
  };

  const result = await compareMissions(options(), fetchImpl, async () => {});

  assert.equal(result.same, false);
  assert.deepEqual(result.onlyV0, ["id-2"]);
  assert.deepEqual(result.onlyV2, []);
});

test("détecte des identifiants divergents pour le même clientId", async () => {
  const fetchImpl: typeof fetch = async (input) => {
    const url = input as URL;
    if (url.pathname === "/v2/mission") {
      return json({ data: [mission("id-v2", "client-1")], hasMore: false, nextCursor: null });
    }
    return json({ data: [mission("id-v0", "client-1")], total: 1 });
  };

  const result = await compareMissions(options(), fetchImpl, async () => {});

  assert.equal(result.same, false);
  assert.deepEqual(result.onlyV2, ["id-v2"]);
  assert.deepEqual(result.onlyV0, ["id-v0"]);
});

test("applique l'offset demandé uniquement à la requête v0 de mesure", async () => {
  const v0Offsets: string[] = [];
  const fetchImpl: typeof fetch = async (input) => {
    const url = input as URL;
    if (url.pathname === "/v2/mission") {
      return json({ data: [mission("id-1", "client-1")], hasMore: false, nextCursor: null });
    }
    v0Offsets.push(url.searchParams.get("skip") ?? "absent");
    return json({ data: url.searchParams.get("skip") === "0" ? [mission("id-1", "client-1")] : [], total: 1 });
  };

  const result = await compareMissions(options(["--offset", "5000"]), fetchImpl, async () => {});

  assert.equal(result.same, true);
  assert.deepEqual(v0Offsets, ["5000", "0"]);
});
