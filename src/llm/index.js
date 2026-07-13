import { env } from "../config/env.js";

const SUPPORTED_PROVIDERS = ["openai", "groq"];

function resolveProviderConfig(provider) {
  if (provider === "openai") {
    return {
      apiKey: env.openAiApiKey,
      model: env.openAiModel,
      maxOutputTokens: env.openAiMaxOutputTokens,
      apiKeyEnv: "OPENAI_API_KEY",
      modulePath: "./openaiProvider.js",
      className: "OpenAIProvider"
    };
  }

  if (provider === "groq") {
    return {
      apiKey: env.groqApiKey,
      model: env.groqModel,
      maxOutputTokens: env.groqMaxOutputTokens,
      apiKeyEnv: "GROQ_API_KEY",
      modulePath: "./groqProvider.js",
      className: "GroqProvider"
    };
  }

  return null;
}

export async function createLLMProvider() {
  const provider = String(env.llmProvider || "").toLowerCase();

  if (!provider) {
    throw new Error(
      "LLM_PROVIDER nao configurado. Defina 'openai' ou 'groq' no .env"
    );
  }

  const config = resolveProviderConfig(provider);

  if (!config) {
    throw new Error(
      `LLM provider nao suportado: ${provider}. Use: ${SUPPORTED_PROVIDERS.join(", ")}`
    );
  }

  if (!config.apiKey) {
    throw new Error(
      `LLM_PROVIDER=${provider}, mas ${config.apiKeyEnv} nao esta configurada`
    );
  }

  const module = await import(config.modulePath);
  const ProviderClass = module[config.className];

  return new ProviderClass({
    apiKey: config.apiKey,
    model: config.model,
    maxOutputTokens: config.maxOutputTokens
  });
}
