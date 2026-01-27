import http from "http";
import url from "url";

let mockServer: http.Server;

/*
 * Global setup for testing environment
 *
 * Run mock HTTP server on specific port:
 * - It will be used by the app during tests
 * - Each needed route is mocked to return fake data
 * - Other ones will return 404 error code
 */
async function globalSetup() {
  mockServer = startMockServer();

  return async () => {
    if (mockServer) {
      mockServer.close();
    }
  };
}

function startMockServer() {
  const server = http.createServer((req, res) => {
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") {
      res.writeHead(200);
      res.end();
      return;
    }

    const parsedUrl = url.parse(req.url || "", true);
    const pathname = parsedUrl.pathname;

    // /r/apply
    if (pathname === "/r/apply") {
      res.writeHead(200);
      res.end(JSON.stringify({ ok: true, id: "mock-apply-id" }));
      return;
    }

    // /r/account
    if (pathname === "/r/account") {
      res.writeHead(200);
      res.end(JSON.stringify({ ok: true, id: "mock-account-id" }));
      return;
    }

    // /r/impression/:missionId/:publisherId
    if (pathname?.match(/\/r\/impression\/[^/]+\/[^/]+$/)) {
      res.writeHead(200);
      res.end(JSON.stringify({ ok: true }));
      return;
    }

    // /r/:statsId/confirm-human
    if (pathname?.match(/\/r\/[^/]+\/confirm-human$/)) {
      res.writeHead(200);
      res.end(JSON.stringify({ ok: true }));
      return;
    }

    console.log(`No handler for ${pathname}, returning 404`);
    res.writeHead(404);
    res.end(JSON.stringify({ ok: false, error: "Not found", path: pathname }));
  });

  const port = 3099;
  server.listen(port, () => {
    console.log(`Mock API server running on port ${port}`);
  });

  return server;
}

export default globalSetup;
