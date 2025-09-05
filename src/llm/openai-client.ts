import OpenAI from "openai/index";
import { z } from "zod";
import { zodResponseFormat } from "openai/helpers/zod";
import { LLMClient, RuleGenerationResult } from "./client.js";
import type { Config } from "../config.js";

const allowedCategories = [
  "testing",
  "naming",
  "architecture",
  "documentation",
  "error-handling",
  "performance",
  "security",
  "style",
  "best-practices",
] as const;

const responseSchema = z
  .object({
    rule: z
      .object({
        rule_text: z.string().min(1),
        category: z.enum(allowedCategories),
      })
      .nullable(),
    reason: z.string().nullable(),
  })
  .strict();

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
    const prompt = this.buildGenerateRulePrompt(instruction, context);
    const responseFormat = zodResponseFormat(
      responseSchema,
      "RuleGenerationResponse",
    );

    for (let attempt = 1; attempt <= this.config.maxRetries; attempt++) {
      try {
        const response = await this.client.chat.completions.parse({
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
          response_format: responseFormat,
        });

        const parsed = response.choices[0]!.message.parsed;

        if (!parsed) {
          return {
            success: false,
            rule: null,
            reason: null,
            error: `Failed to generate rule. Error: ${response.choices[0]!.message.refusal}`,
          };
        }

        if (parsed.rule) {
          return {
            success: true,
            rule: {
              rule_text: parsed.rule.rule_text,
              category: parsed.rule.category,
            },
            reason: null,
            error: null,
          };
        }
        return {
          success: true,
          rule: null,
          reason: parsed.reason,
          error: null,
        };
      } catch (error) {
        console.error(`Attempt ${attempt} failed:`, error);

        if (attempt === this.config.maxRetries) {
          return {
            success: false,
            rule: null,
            reason: null,
            error: `Failed to generate rule after ${this.config.maxRetries} attempts: ${error instanceof Error ? error.message : "Unknown error"}`,
          };
        }

        // Wait before retrying
        await this.delay(this.config.retryDelay * attempt);
      }
    }

    return {
      success: false,
      rule: null,
      reason: null,
      error: "Unexpected error in rule generation",
    };
  }

  private buildGenerateRulePrompt(
    instruction: string,
    context: string,
  ): string {
    return `Task: Determine if the instruction is generalizable and, if so, convert it into a concise, abstract rule.

User Instruction: "${instruction}"
Context: "${context}"

Decision Guidance:
- Generalizable: testing practices, error handling, security, naming, documentation, performance habits, architecture, style, best practices.
- Not generalizable: pixel tweaks, one-off identifiers, single-use coordinates/IDs, hyper-specific changes.

Success Criteria (when returning a rule):
- The rule captures a broadly applicable practice, not a one-off change.
- Use imperative voice and neutral language (no project-specific names).
- Avoid specific numbers, coordinates, filenames, IDs, or single components.
- Avoid time-bound or one-off references (e.g., "now", "in this file only").
- Choose one category that best fits the rule from the allowed set.

Examples — Generalizable → Rule:
1) Instruction: "When you're done, write and execute unit and integration tests for the feature."
   Rule: "After implementing a feature, write and run unit and integration tests."
   Category: "testing"

2) Instruction: "Always sanitize user input before database writes."
   Rule: "Sanitize user input before persisting to the database."
   Category: "security"

3) Instruction: "Prefer PascalCase for React component names."
   Rule: "Use PascalCase for component names."
   Category: "naming"

4) Instruction: "Handle database errors and retry transient failures."
   Rule: "Add error handling to database operations and retry transient failures."
   Category: "error-handling"

Examples — Not Generalizable (return rule: null):
- "Move the button 3 px right"
- "Rename UserService to AccountService in file services/user.ts"
- "Increase timeout from 30s to 35s in payment.ts"

Output JSON (strict). If generalizable, provide a rule; otherwise return rule: null with a reason:
{
  "rule": {
    "rule_text": "Concise, abstract rule",
    "category": "testing | naming | architecture | documentation | error-handling | performance | security | style | best-practices"
  },
  "reason": null
}

Or when not generalizable:
{
  "rule": null,
  "reason": "Explain briefly why this is not generalizable"
}`;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
