import PublisherModel from "../../models/publisher";
import { BaseHandler } from "../base/handler";
import { checkBotClicks } from "./bot";

import { captureException } from "../../error";
import { JobResult } from "../types";
import { checkImports } from "./import";
import { checkTracking } from "./tracking";

export interface WarningsJobPayload {}

export interface WarningsJobResult extends JobResult {}

export class WarningsHandler implements BaseHandler<WarningsJobPayload, WarningsJobResult> {
  name = "Vérification des warnings";

  async handle(payload: WarningsJobPayload): Promise<WarningsJobResult> {
    const start = new Date();
    try {
      console.log(`[Warnings] Starting at ${start.toISOString()}`);
      const publishers = await PublisherModel.find({ isAnnonceur: true });

      console.log("Checking imports");
      await checkImports(publishers);

      console.log("Checking tracking");
      await checkTracking(publishers);

      console.log("Checking bots");
      await checkBotClicks();

      console.log(`[Warnings] Ended at ${new Date().toISOString()} in ${(Date.now() - start.getTime()) / 1000}s`);

      return {
        success: true,
        timestamp: new Date(),
        message: "Warnings checked successfully",
      };
    } catch (error) {
      captureException(error);
      return {
        success: false,
        timestamp: new Date(),
      };
    }
  }
}
