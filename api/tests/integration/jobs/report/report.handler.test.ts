import { describe, expect, it } from "vitest";

import { ReportHandler } from "@/jobs/report/handler";
import { reportService } from "@/services/report";
import { createTestPublisher } from "../../../fixtures";

describe("Report job handler (integration)", () => {
  const handler = new ReportHandler();

  it("runs to completion with no stat_event data and creates a NOT_GENERATED_NO_DATA report", { timeout: 30000 }, async () => {
    const publisher = await createTestPublisher({
      sendReport: true,
      hasApiRights: true,
    });

    const result = await handler.handle({ dryRun: true, publisherId: publisher.id });

    expect(result.success).toBe(true);

    const report = await reportService.findOneReportByPublisherAndPeriod(
      publisher.id,
      new Date().getMonth() !== 0 ? new Date().getFullYear() : new Date().getFullYear() - 1,
      new Date().getMonth() !== 0 ? new Date().getMonth() - 1 : 11
    );

    expect(report).not.toBeNull();
    expect(report!.status).toBe("NOT_GENERATED_NO_DATA");
  });
});
