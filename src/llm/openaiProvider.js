import OpenAI from "openai";

import { LLMProvider } from "./llmProvider.js";

export class OpenAIProvider extends LLMProvider {
  constructor({ apiKey, model }) {
    super();

    if (!apiKey) {
      throw new Error("OPENAI_API_KEY nao configurada");
    }

    this.model = model;
    this.client = new OpenAI({ apiKey });
  }

  async generateDocumentation(context) {
    const response = await this.client.responses.create({
      model: this.model,
      instructions: context.systemPrompt,
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: [
                context.instructions,
                "",
                "Diff do commit:",
                context.diff,
                "",
                "Metadata:",
                JSON.stringify(context.metadata || {}, null, 2)
              ].join("\n")
            }
          ]
        }
      ]
    });

    return response.output_text?.trim() || "";
  }
}
