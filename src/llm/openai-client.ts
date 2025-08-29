import OpenAI from "openai";
import { LLMClient, RuleGenerationResult } from "./client.js";
import type { Config } from "../config.js";

export class OpenAIClient implements LLMClient {
  private client: OpenAI;
  private config: {
    apiKey: string;
    model: string;
    maxRetries: number;
    retryDelay: number;
  };

  constructor(config: Config) {
    this.config = {
      apiKey: config.openaiApiKey!,
      model: config.llmModel,
      maxRetries: config.llmMaxRetries,
      retryDelay: config.llmRetryDelay,
    };

    this.client = new OpenAI({
      apiKey: this.config.apiKey,
    });
  }

  async generateRule(
    instruction: string,
    context: string,
  ): Promise<RuleGenerationResult> {
    const prompt = this.buildPrompt(instruction, context);

    for (let attempt = 1; attempt <= this.config.maxRetries; attempt++) {
      try {
        const response = await this.client.chat.completions.create({
          model: this.config.model,
          messages: [
            {
              role: "system",
              content:
                "You are a coding assistant that extracts abstract rules from developer instructions.",
            },
            {
              role: "user",
              content: prompt,
            },
          ],
        });

        console.error(response.choices[0]?.message);

        const content = response.choices[0]?.message?.content;
        if (!content) {
          throw new Error("No content received from OpenAI");
        }

        return this.parseResponse(content);
      } catch (error) {
        console.error(`Attempt ${attempt} failed:`, error);

        if (attempt === this.config.maxRetries) {
          return {
            success: false,
            error: `Failed to generate rule after ${this.config.maxRetries} attempts: ${error instanceof Error ? error.message : "Unknown error"}`,
          };
        }

        // Wait before retrying
        await this.delay(this.config.retryDelay * attempt);
      }
    }

    return {
      success: false,
      error: "Unexpected error in rule generation",
    };
  }

  private buildPrompt(instruction: string, context: string): string {
    return `Task: Convert the following user instruction into a concise, abstract rule.

User Instruction: "${instruction}"
Context: "${context}"

Requirements:
1. Extract the core principle into a short, actionable rule
2. Make it general enough to apply to similar situations
3. Assign an appropriate category (testing, naming, architecture, documentation, error-handling, performance, security)

Output Format (JSON):
{
  "rule_text": "Concise, abstract rule",
  "category": "category_name"
}`;
  }

  private parseResponse(content: string): RuleGenerationResult {
    try {
      // Try to extract JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("No JSON found in response");
      }

      const parsed = JSON.parse(jsonMatch[0]);

      if (!parsed.rule_text || !parsed.category) {
        throw new Error(
          "Invalid response format: missing rule_text or category",
        );
      }

      return {
        success: true,
        rule: {
          rule_text: parsed.rule_text,
          category: parsed.category,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to parse LLM response: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
