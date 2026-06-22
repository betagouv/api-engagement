import { mistral } from "@ai-sdk/mistral";
import { openai } from "@ai-sdk/openai";

import { AlbertProvider } from "@/services/ai/providers/albert";
import { VercelAiProviderAdapter } from "@/services/ai/providers/vercel-ai";
import { AiService } from "@/services/ai/service";

export const ai = new AiService({
  albert: new AlbertProvider(),
  mistral: new VercelAiProviderAdapter(mistral),
  openai: new VercelAiProviderAdapter(openai),
});

export { AiService } from "@/services/ai/service";
export type { AiProvider } from "@/services/ai/service";
