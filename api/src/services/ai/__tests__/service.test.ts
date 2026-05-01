import type { LanguageModel } from "ai";
import { describe, expect, it, vi } from "vitest";

import { AiService } from "@/services/ai/service";

const fakeModel = { specificationVersion: "v3", provider: "test", modelId: "model", supportedUrls: {} } as LanguageModel;

describe("AiService", () => {
  it("delegates model creation to the requested provider", () => {
    const provider = { languageModel: vi.fn().mockReturnValue(fakeModel) };
    const service = new AiService({ test: provider });

    expect(service.model("test", "model")).toBe(fakeModel);
    expect(provider.languageModel).toHaveBeenCalledWith("model");
  });

  it("rejects unknown providers", () => {
    const service = new AiService({});

    expect(() => service.model("missing", "model")).toThrow("Unknown AI provider: missing");
  });
});
