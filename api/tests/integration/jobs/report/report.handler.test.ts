import { afterEach, describe, expect, it, vi } from "vitest";

import { getData } from "@/jobs/report/generate/data";
import { ReportHandler } from "@/jobs/report/handler";
import { sendReports } from "@/jobs/report/send";
import * as brevo from "@/services/brevo";
import { metabaseService } from "@/services/metabase";
import { publisherService } from "@/services/publisher";
import { reportService } from "@/services/report";
import { createTestPublisher } from "../../../fixtures";
import { createTestReport } from "../../../fixtures/report";
import { createTestUser } from "../../../fixtures/user";

describe("Report job handler (integration)", () => {
  const handler = new ReportHandler();

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("sends to selected recipients and retries only the failed recipient", async () => {
    const publisher = await createTestPublisher({ sendReport: true });
    const { user: alice } = await createTestUser({ firstname: "Alice", email: "alice@example.com", publishers: [publisher.id] });
    const { user: bob } = await createTestUser({ firstname: "Bob", email: "bob@example.com", publishers: [publisher.id] });
    await createTestUser({ email: "not-selected@example.com", publishers: [publisher.id] });
    await publisherService.updatePublisher(publisher.id, { sendReportTo: [alice.id, bob.id] });
    const report = await createTestReport({ publisherId: publisher.id, year: 2026, month: 9, dataTemplate: "RECEIVED" });
    let failForBob = true;
    const send = vi.spyOn(brevo, "sendTemplate").mockImplementation(async (_, options) => ({
      ok: !(failForBob && options.emailTo.includes(bob.email)),
    }));
    const templateIds = { ANNONCEUR: 20, DIFFUSEUR: 9, ANNONCEUR_DIFFUSEUR: 21 };

    expect(await sendReports(templateIds, 2026, 9, publisher.id)).toMatchObject({ count: 1, errors: [expect.anything()] });
    expect(send).toHaveBeenCalledTimes(2);
    expect(send).toHaveBeenCalledWith(20, expect.objectContaining({ emailTo: [alice.email] }));
    expect(send.mock.calls[0][1].params).not.toHaveProperty("first_name");
    expect(await reportService.findOneReportById(report.id)).toMatchObject({ status: "PARTIALLY_SENT", sentTo: [alice.email] });

    failForBob = false;
    send.mockClear();
    expect(await sendReports(templateIds, 2026, 9, publisher.id)).toMatchObject({ count: 1, errors: [] });
    expect(send).toHaveBeenCalledExactlyOnceWith(20, expect.objectContaining({ emailTo: [bob.email] }));
    expect(await reportService.findOneReportById(report.id)).toMatchObject({ status: "SENT", sentTo: [alice.email, bob.email] });

    send.mockClear();
    expect(await sendReports(templateIds, 2026, 9, publisher.id)).toMatchObject({ count: 0, errors: [], skipped: [publisher.id] });
    expect(send).not.toHaveBeenCalled();
  });

  it("uses the Performance totals and ranks partners by applications for both activities", async () => {
    const publisher = await createTestPublisher({ isAnnonceur: true, hasApiRights: true });
    const response = (columns: string[], rows: unknown[][]) => ({
      ok: true,
      status: 200,
      data: { data: { cols: columns.map((name) => ({ name })), rows } },
    });
    const query = vi.spyOn(metabaseService, "queryCard")
      .mockResolvedValueOnce(response(["total_click", "total_apply"], [[108368, 2586]]))
      .mockResolvedValueOnce(response(["total_click", "total_apply"], [[100000, 2500]]))
      .mockResolvedValueOnce(response(["publisher_name", "doc_count"], [[` ${publisher.name.toUpperCase()} `, 1000], ["Autre diffuseur", 20], ["leboncoin", "652"]]))
      .mockResolvedValueOnce(response(["total_click", "total_apply"], [[7595, 316]]))
      .mockResolvedValueOnce(response(["total_click", "total_apply"], [[6063, 270]]))
      .mockResolvedValueOnce(
        response(
          ["apply_count", "publisher_name"],
          [[300, publisher.name], [20, "Autre annonceur"], [270, "Annonceur classé"]]
        )
      );

    const stats = await getData(2026, 9, publisher);

    expect(stats.receive).toEqual({
      click: 108368,
      apply: 2586,
      clickChangePct: 8.4,
      applyChangePct: 3.4,
      conversionRatePct: 2.39,
      conversionChangePp: -0.1,
      topPublisher: "leboncoin",
      topPublisherApply: 652,
    });
    expect(stats.send).toMatchObject({ click: 7595, apply: 316, topPublisher: "Annonceur classé", topPublisherApply: 270 });
    const october = { publisher_id: publisher.id, from: "2026-10-01", to: "2026-10-31" };
    const september = { publisher_id: publisher.id, from: "2026-09-01", to: "2026-09-30" };
    expect(query.mock.calls).toEqual([
      [5490, { variables: october }],
      [5490, { variables: september }],
      [5489, { variables: { ...october, type: "apply" } }],
      [5495, { variables: october }],
      [5495, { variables: september }],
      [5487, { variables: october }],
    ]);
  });

  it("creates a NOT_GENERATED_NO_DATA report when the Metabase card returns no rows", { timeout: 30000 }, async () => {
    vi.spyOn(metabaseService, "queryCard").mockResolvedValue({ ok: true, status: 200, data: { data: { cols: [], rows: [] } } });
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
