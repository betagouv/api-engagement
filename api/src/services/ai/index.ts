import { mistral } from "@ai-sdk/mistral";

import { AiService } from "@/services/ai/service";
import { AlbertProvider } from "@/services/ai/providers/albert";
import { VercelAiProviderAdapter } from "@/services/ai/providers/vercel-ai";

export const ai = new AiService({
  albert: new AlbertProvider(),
  mistral: new VercelAiProviderAdapter(mistral),
});

export type { AiProvider } from "@/services/ai/service";
export { AiService } from "@/services/ai/service";
