import integrationConfig from "./vitest.integration.config";
import unitConfig from "./vitest.unit.config";

const suite = process.env.VITEST_SUITE === "integration" ? "integration" : "unit";

export default suite === "integration" ? integrationConfig : unitConfig;
