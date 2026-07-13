import Groq from "groq-sdk";

import { LLMProvider } from "./llmProvider.js";
import { buildDocumentationPrompt } from "./prompt-builder.js";

export class GroqProvider extends LLMProvider {
  constructor({ apiKey, model, maxOutputTokens }) {
    super();

    if (!apiKey) {
      throw new Error("GROQ_API_KEY nao configurada");
    }

    this.model = model;
    this.maxOutputTokens = maxOutputTokens;
    this.client = new Groq({ apiKey });
  }

  async generateDocumentation(context) {
    const response = await this.client.chat.completions.create({
      model: this.model,
      max_tokens: this.maxOutputTokens,
      messages: [
        {
          role: "system",
          content: context.systemPrompt
        },
        {
          role: "user",
          content: buildDocumentationPrompt(context)
        }
      ]
    });

    return response.choices[0]?.message?.content?.trim() || "";
  }
}
