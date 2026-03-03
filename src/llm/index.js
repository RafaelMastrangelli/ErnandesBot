import { env } from "../config/env.js";
import { OpenAIProvider } from "./openaiProvider.js";

export function createLLMProvider() {
  const provider = String(env.llmProvider || "").toLowerCase();

  if (provider === "openai") {
    return new OpenAIProvider({
      apiKey: env.openAiApiKey,
      model: env.openAiModel
    });
  }

  throw new Error(`LLM provider nao suportado: ${provider || "undefined"}`);
}
