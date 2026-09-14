import fs from "fs";
import http from "http";
import path from "path";
import url from "url";
import { MISSION_IMAGE_PATH, mockBrowseResponse, mockWidgetResponse } from "./fixtures/mockData";

let mockServer: any;

/*
 * Global setup for testing environment
 *
 * Run mock HTTP server on specific port:
 * - It will be used by Next app during tests
 * - Each needed route is mocked to return fake data
 * - Les images des missions sont servies en local : les tirer d'internet rendait les
 *   captures de régression visuelle dépendantes du réseau, donc instables en CI
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
    res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With");

    if (req.method === "OPTIONS") {
      res.writeHead(204);
      res.end();
      return;
    }

    const parsedUrl = url.parse(req.url || "", true);
    const pathname = parsedUrl.pathname;

    if (pathname === MISSION_IMAGE_PATH) {
      res.setHeader("Content-Type", "image/jpeg");
      res.writeHead(200);
      res.end(fs.readFileSync(path.join(__dirname, "fixtures/images/mission.jpg")));
      return;
    }

    if (pathname === "/api-mock/iframe/widget") {
      res.writeHead(200);
      res.end(JSON.stringify(mockWidgetResponse(parsedUrl.query.id as string)));
      return;
    }

    if (pathname?.match(/\/api-mock\/missions\/browse\/widget\/[^/]+$/)) {
      res.writeHead(200);
      res.end(JSON.stringify(mockBrowseResponse));
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
