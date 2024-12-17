import PublisherModel from "../../models/publisher";
import { checkBotClicks } from "./bot";

import { checkImports } from "./import";
import { checkTracking } from "./tracking";

const handler = async () => {
  const start = new Date();
  console.log(`[Warnings] Starting at ${start.toISOString()}`);
  const publishers = await PublisherModel.find({ role_promoteur: true });

  console.log("Checking imports");
  await checkImports(publishers);

  console.log("Checking tracking");
  await checkTracking(publishers);

  console.log("Checking bots");
  await checkBotClicks();

  console.log(`[Warnings] Ended at ${new Date().toISOString()} in ${(Date.now() - start.getTime()) / 1000}s`);
};

export default { handler };
