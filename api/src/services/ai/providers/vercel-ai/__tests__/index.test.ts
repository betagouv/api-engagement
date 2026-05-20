import type { LanguageModel } from "ai";
import { describe, expect, it, vi } from "vitest";

import { VercelAiProviderAdapter } from "@/services/ai/providers/vercel-ai";

const fakeModel = { specificationVersion: "v3", provider: "test", modelId: "model", supportedUrls: {} } as LanguageModel;

describe("VercelAiProviderAdapter", () => {
  it("delegates model creation to the wrapped factory", () => {
    const factory = vi.fn().mockReturnValue(fakeModel);
    const adapter = new VercelAiProviderAdapter(factory);

    expect(adapter.languageModel("model")).toBe(fakeModel);
    expect(factory).toHaveBeenCalledWith("model");
  });
});
