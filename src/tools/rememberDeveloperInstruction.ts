import { z } from "zod";
import Database from "better-sqlite3";
import { LLMClient } from "../llm/index.js";
import { EmbeddingClient } from "../llm/index.js";
import { SQLiteRulesRepo } from "../repos/rules-repo.js";
import { SQLiteInstructionsRepo } from "../repos/instructions-repo.js";

export const rememberDeveloperInstructionSchema = {
  title: "Remember User Instruction",
  description: `Remember a user instruction for future use. LLMs should call this tool whenever they are given a generalizable instruction by the user. The instruction will be stored in a database and can be retrieved later.
  The instruction is the generalizable instruction that the user is asking to be remembered.
  The context describes what the user was working on when they gave the instruction.`,
  inputSchema: {
    instruction: z.string(),
    context: z.string(),
  },
};

export async function rememberDeveloperInstructionHandler(
  { instruction, context }: { instruction: string; context: string },
  db: Database.Database,
  llmClient: LLMClient,
  embeddingClient: EmbeddingClient,
): Promise<{ content: { type: "text"; text: string }[] }> {
  try {
    // Step 1: Use LLM to generate abstract rule
    const ruleGenerationResult = await llmClient.generateRule(
      instruction,
      context,
    );

    if (!ruleGenerationResult.success || !ruleGenerationResult.rule) {
      console.error("Failed to generate rule:", ruleGenerationResult.error);
      return {
        content: [
          {
            type: "text",
            text: `Failed to generate abstract rule: ${ruleGenerationResult.error}`,
          },
        ],
      };
    }

    const { rule_text, category } = ruleGenerationResult.rule;

    // Step 2: Create instruction first
    const instructionsRepo = new SQLiteInstructionsRepo(db);
    let createdInstruction;

    try {
      createdInstruction = await instructionsRepo.createInstruction({
        instruction,
        context,
      });
    } catch (error) {
      console.error("Failed to create instruction:", error);
      return {
        content: [
          {
            type: "text",
            text: `Failed to create instruction: ${error instanceof Error ? error.message : "Unknown error"}`,
          },
        ],
      };
    }

    // Step 3: Create rule with embedding and link to instruction
    const rulesRepo = new SQLiteRulesRepo(db, embeddingClient);

    try {
      const rule = await rulesRepo.createRule({
        ruleText: rule_text,
        category,
        context,
        createdFromInstructionId: createdInstruction.id,
      });

      // Step 4: Update instruction to link to the rule
      instructionsRepo.updateInstructionRuleId(createdInstruction.id, rule.id);

      return {
        content: [
          {
            type: "text",
            text: `Instruction processed successfully. Generated rule: "${rule_text}" (category: ${category}). Rule ID: ${rule.id}, Instruction ID: ${createdInstruction.id}`,
          },
        ],
      };
    } catch (error) {
      console.error("Failed to create rule with embedding:", error);
      return {
        content: [
          {
            type: "text",
            text: `Failed to create rule with embedding: ${error instanceof Error ? error.message : "Unknown error"}`,
          },
        ],
      };
    }
  } catch (error) {
    console.error("Unexpected error in rememberDeveloperInstruction:", error);
    return {
      content: [
        {
          type: "text",
          text: `Unexpected error: ${error instanceof Error ? error.message : "Unknown error"}`,
        },
      ],
    };
  }
}
