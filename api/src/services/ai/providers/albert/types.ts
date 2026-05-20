export type AlbertChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type AlbertChatCompletion = {
  id?: string;
  created?: number;
  model?: string;
  choices?: Array<{
    finish_reason?: string | null;
    message?: {
      content?: string | null;
      role?: string;
    };
  }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
};
