import { startMockServer } from "./setup-env";

let mockServer: any;

async function globalSetup() {
  mockServer = startMockServer();

  return async () => {
    if (mockServer) {
      mockServer.close();
    }
  };
}

export default globalSetup;
