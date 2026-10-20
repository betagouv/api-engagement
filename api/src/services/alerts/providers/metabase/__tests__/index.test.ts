import { describe, expect, it } from "vitest";

import { alertsFromRows, MetabaseAlertProvider } from "@/services/alerts/providers/metabase";

const payload = (cols: unknown[], rows: unknown[][]) => ({ type: "alert", data: { type: "question", raw_data: { cols, rows } } });

describe("alertsFromRows", () => {
  it("maps one alert per row, whatever the column order and case", () => {
    const alerts = alertsFromRows(
      ["Annonceur", "Description", "PUBLISHER_ID", "procedure_url", "title"],
      [["Adie", "0 candidature", "p1", "https://notion.so/p", "Plus de candidature"]]
    );
    expect(alerts).toEqual([{ type: "TRACKING_WARNING", publisherId: "p1", title: "Plus de candidature", description: "0 candidature", procedureUrl: "https://notion.so/p" }]);
  });

  it("accepts columns described as objects and an explicit type", () => {
    expect(alertsFromRows([{ name: "publisher_id" }, { name: "type" }], [["p1", "ERROR_WARNING"]])).toMatchObject([{ publisherId: "p1", type: "ERROR_WARNING" }]);
  });

  it("skips rows without publisher_id and turns empty values into undefined", () => {
    const alerts = alertsFromRows(
      ["publisher_id", "title"],
      [
        [null, "orpheline"],
        ["", "vide"],
        ["p2", ""],
        [42, null],
      ]
    );
    expect(alerts).toEqual([
      { type: "TRACKING_WARNING", publisherId: "p2", title: undefined, description: undefined, procedureUrl: undefined },
      { type: "TRACKING_WARNING", publisherId: "42", title: undefined, description: undefined, procedureUrl: undefined },
    ]);
  });

  it("returns nothing when there is no publisher_id column", () => {
    expect(alertsFromRows(["annonceur"], [["Adie"]])).toEqual([]);
  });
});

describe("MetabaseAlertProvider.parse", () => {
  const provider = new MetabaseAlertProvider();

  it("returns the alerts and the number of rows received", () => {
    const result = provider.parse(payload(["publisher_id"], [["p1"], [null]]));
    expect(result).toMatchObject({ success: true, data: { received: 2 } });
    expect(result.success && result.data.alerts).toHaveLength(1);
  });

  it("rejects a payload that is not an alert", () => {
    expect(provider.parse({ type: "dashboard_subscription", data: {} }).success).toBe(false);
    expect(provider.parse({}).success).toBe(false);
  });

  it("rejects an invalid procedure_url", () => {
    expect(provider.parse(payload(["publisher_id", "procedure_url"], [["p1", "pas une url"]])).success).toBe(false);
  });
});
