import http from "http";
import url from "url";
import { mockAggsResponse, mockMissionsResponse, mockWidgetResponse } from "./fixtures/mockData";

let mockServer: any;

/*
 * Global setup for testing environment
 *
 * Run mock HTTP server on specific port:
 * - It will be used by Next app during tests
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

    const parsedUrl = url.parse(req.url || "", true);
    const pathname = parsedUrl.pathname;

    if (pathname === "/api-mock/iframe/widget") {
      res.writeHead(200);
      res.end(JSON.stringify(mockWidgetResponse));
      return;
    }

    if (pathname?.match(/\/api-mock\/iframe\/[^/]+\/search$/)) {
      res.writeHead(200);
      res.end(JSON.stringify(mockMissionsResponse));
      return;
    }

    if (pathname?.match(/\/api-mock\/iframe\/[^/]+\/aggs$/)) {
      res.writeHead(200);
      res.end(JSON.stringify(mockAggsResponse));
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
