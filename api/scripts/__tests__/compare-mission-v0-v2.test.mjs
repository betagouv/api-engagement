import assert from "node:assert/strict";
import { test } from "node:test";

import { compareMissions, parseOptions } from "../compare-mission-v0-v2.mjs";

const options = (overrides = {}) => ({
  ...parseOptions(["--publisher-id", "publisher-1", "--base-url", "https://example.test", "--page-size", "1", "--batch-size", "2", "--delay-ms", "0"], {
    API_ENGAGEMENT_API_KEY: "secret-test",
  }),
  ...overrides,
});

const mission = (id, clientId) => ({ id, clientId, publisherId: "publisher-1" });
const json = (body) => new Response(JSON.stringify({ ok: true, ...body }), { status: 200, headers: { "content-type": "application/json" } });

test("compare les ensembles indépendamment de leur ordre, sans offset v0 profond", async () => {
  const calls = [];
  const fetchImpl = async (url, init) => {
    const path = url.pathname;
    const query = url.searchParams;
    calls.push({ path, query: new URLSearchParams(query), apiKey: init.headers["x-api-key"] });
    if (path === "/v2/mission" && !query.has("cursor")) {
      return json({ data: [mission("id-1", "client-1")], hasMore: true, nextCursor: "id-1" });
    }
    if (path === "/v2/mission") {
      return json({ data: [mission("id-2", "client-2")], hasMore: false, nextCursor: null });
    }
    if (query.get("limit") === "1") {
      return json({ data: [mission("id-1", "client-1")], total: 2 });
    }
    return json({ data: [mission("id-2", "client-2"), mission("id-1", "client-1")], total: 2 });
  };

  const result = await compareMissions(options(), fetchImpl, async () => {});

  assert.equal(result.same, true);
  assert.equal(result.v0Total, 2);
  assert.equal(result.v2Total, 2);
  assert.equal(result.v0Batches, 1);
  assert.deepEqual(calls.filter((call) => call.path === "/v0/mission").map((call) => call.query.get("skip")), ["0", "0"]);
  assert.ok(calls.every((call) => call.apiKey === "secret-test" && call.query.get("publisher") === "publisher-1"));
});

test("détecte une mission uniquement en v0 grâce au total global", async () => {
  const fetchImpl = async (url) => {
    if (url.pathname === "/v2/mission") {
      return json({ data: [mission("id-1", "client-1")], hasMore: false, nextCursor: null });
    }
    return json({ data: [mission("id-1", "client-1")], total: url.searchParams.has("clientId") ? 1 : 2 });
  };

  const result = await compareMissions(options(), fetchImpl, async () => {});

  assert.equal(result.same, false);
  assert.equal(result.onlyV0Unknown, 1);
  assert.deepEqual(result.onlyV2, []);
});

test("détecte des identifiants divergents pour le même clientId", async () => {
  const fetchImpl = async (url) => {
    if (url.pathname === "/v2/mission") {
      return json({ data: [mission("id-v2", "client-1")], hasMore: false, nextCursor: null });
    }
    return json({ data: [mission("id-v0", "client-1")], total: 1 });
  };

  const result = await compareMissions(options(), fetchImpl, async () => {});

  assert.equal(result.same, false);
  assert.deepEqual(result.onlyV2, ["id-v2"]);
  assert.deepEqual(result.onlyV0Found, ["id-v0"]);
});
