import { z } from "zod";
import Database from "better-sqlite3";
import { EmbeddingClient } from "../llm/index.js";
import { SQLiteRulesRepo } from "../repos/rules-repo.js";

/**
 * Parameters for the getRelevantRules tool.
 */
export interface GetRelevantRulesParams {
  /** Description of the current task/context */
  taskDescription: string;
  /** Maximum number of rules to return (default: 5) */
  maxResults?: number;
  /** Minimum similarity score (-1 to 1, default: 0) */
  similarityThreshold?: number;
}

/**
 * Result of the getRelevantRules tool.
 */
export interface GetRelevantRulesResult {
  /** Whether the operation was successful */
  success: boolean;
  /** Array of relevant rules if successful */
  rules?: Array<{
    id: number;
    rule_text: string;
    category: string;
    context: string;
    relevance_score: number;
    instructions_count: number;
    last_applied: Date | null;
    inserted_at: Date;
  }>;
  /** Error message if unsuccessful */
  error?: string;
}

/**
 * MCP tool schema for getRelevantRules.
 */
export const getRelevantRulesSchema = {
  title: "Get Relevant Rules",
  description:
    "Find relevant development rules based on a task description using vector similarity search. Returns rules that are semantically similar to the given task description.",
  inputSchema: {
    taskDescription: z
      .string()
      .describe(
        "Description of the current task or context (e.g., 'implement a new api endpoint, write unit tests for it')",
      ),
    maxResults: z
      .number()
      .optional()
      .default(5)
      .describe("Maximum number of rules to return (default: 5)"),
    similarityThreshold: z
      .number()
      .optional()
      .default(0)
      .describe("Minimum similarity score (-1 to 1, default: 0)"),
  },
};

/**
 * Handler for the getRelevantRules tool.
 * Generates an embedding for the task description and finds similar rules.
 * @param params - Tool parameters
 * @param db - SQLite database connection
 * @param embeddingClient - Client for generating embeddings
 * @returns Promise that resolves to the tool result
 */
export async function getRelevantRulesHandler(
  params: GetRelevantRulesParams,
  db: Database.Database,
  embeddingClient: EmbeddingClient,
): Promise<{ content: { type: "text"; text: string }[] }> {
  try {
    const { taskDescription, maxResults = 5, similarityThreshold = 0 } = params;

    // Validate input
    if (!taskDescription.trim()) {
      return {
        content: [
          {
            type: "text",
            text: "Error: taskDescription cannot be empty",
          },
        ],
      };
    }

    if (maxResults < 1 || maxResults > 100) {
      return {
        content: [
          {
            type: "text",
            text: "Error: maxResults must be between 1 and 100",
          },
        ],
      };
    }

    if (similarityThreshold < -1 || similarityThreshold > 1) {
      return {
        content: [
          {
            type: "text",
            text: "Error: similarityThreshold must be between -1 and 1",
          },
        ],
      };
    }

    // Step 1: Generate embedding for the task description
    const embeddingResult =
      await embeddingClient.generateEmbedding(taskDescription);

    if (!embeddingResult.success || !embeddingResult.embedding) {
      return {
        content: [
          {
            type: "text",
            text: `Failed to generate embedding for task description: ${embeddingResult.error}`,
          },
        ],
      };
    }

    // Step 2: Find similar rules using vector similarity search
    const rulesRepo = new SQLiteRulesRepo(db, embeddingClient);
    const similarRules = await rulesRepo.findSimilarRules(
      embeddingResult.embedding,
      maxResults,
      similarityThreshold,
    );

    // Step 3: Format the response
    if (similarRules.length === 0) {
      return {
        content: [
          {
            type: "text",
            text: `No relevant rules found for task description: "${taskDescription}" (similarity threshold: ${similarityThreshold})`,
          },
        ],
      };
    }

    const rulesText = similarRules
      .map(
        (rule) =>
          `- **${rule.rule_text}** (category: ${rule.category}, relevance: ${rule.relevance_score.toFixed(3)})`,
      )
      .join("\n");

    return {
      content: [
        {
          type: "text",
          text: `Found ${similarRules.length} relevant rules for task: "${taskDescription}"\n\n${rulesText}`,
        },
      ],
    };
  } catch (error) {
    console.error("Unexpected error in getRelevantRules:", error);
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
