import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/config", () => ({ SLACK_TOKEN: "xoxb-test" }));

import { postMessage } from "@/services/slack";

describe("postMessage", () => {
  const fetchMock = vi.fn().mockResolvedValue({ json: async () => ({ ok: true }) });
  vi.stubGlobal("fetch", fetchMock);
  vi.spyOn(console, "log").mockImplementation(() => {});

  afterEach(() => fetchMock.mockClear());

  it("only logs when no channel is configured for the environment", async () => {
    expect(await postMessage({ text: "hello" }, "")).toEqual({ ok: true });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("posts to Slack when a token and a channel are set", async () => {
    await postMessage({ text: "hello" }, "C123");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).channel).toBe("C123");
  });
});
