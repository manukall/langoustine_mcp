import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { initializeDatabase } from "../database.js";
import { createTestConfig } from "../test-utils.js";
import { rememberDeveloperInstructionHandler } from "./rememberDeveloperInstruction.js";
import { OpenAIEmbeddingClient } from "../llm/embedding-client.js";
import { OpenAIClient } from "../llm/openai-client.js";
import Database from "better-sqlite3";
import { Rule, UserInstruction } from "../types.js";

// Only run integration tests if explicitly requested
const shouldRunIntegrationTests = process.env.RUN_INTEGRATION_TESTS === "true";

// Skip all tests if integration testing is not enabled
const testFn = shouldRunIntegrationTests ? describe : describe.skip;

const testDbPath = `:memory:`;

testFn("rememberDeveloperInstruction End-to-End Integration Tests", () => {
  let db: Database.Database;
  let embeddingClient: OpenAIEmbeddingClient;
  let llmClient: OpenAIClient;

  beforeAll(() => {
    // Verify we have the required environment variables
    if (!process.env.LANGOUSTINE_MCP_TESTING_OPENAI_API_KEY) {
      throw new Error(
        "LANGOUSTINE_MCP_TESTING_OPENAI_API_KEY environment variable is required for integration tests",
      );
    }

    // Initialize database
    const testConfig = createTestConfig({
      databasePath: testDbPath,
      embeddingModel: "text-embedding-3-small",
      embeddingMaxRetries: 2,
      embeddingRetryDelay: 1000,
      llmMaxRetries: 2,
      llmRetryDelay: 1000,
      openaiApiKey: process.env.LANGOUSTINE_MCP_TESTING_OPENAI_API_KEY,
    });
    db = initializeDatabase(testConfig);

    // Initialize clients
    embeddingClient = new OpenAIEmbeddingClient(testConfig);
    llmClient = new OpenAIClient(testConfig);
  });

  beforeEach(async () => {
    // Clean the database before each test
    if (db) {
      db.prepare("DELETE FROM user_instructions").run();
      db.prepare("DELETE FROM rules").run();
    }
  });

  afterAll(async () => {
    if (db) {
      db.close();
    }
  });

  it("should process a complete instruction and create rule with embedding", async () => {
    const instruction = "Always use TypeScript for new files";
    const context = "writing unit tests";

    const result = await rememberDeveloperInstructionHandler(
      { instruction, context },
      db,
      llmClient,
      embeddingClient,
    );

    expect(result.content).toHaveLength(1);
    expect(result.content[0].type).toBe("text");
    expect(result.content[0].text).toContain(
      "Instruction processed successfully",
    );
    expect(result.content[0].text).toContain("Rule ID:");
    expect(result.content[0].text).toContain("Instruction ID:");

    // Verify the instruction was stored
    const instructions = db
      .prepare("SELECT * FROM user_instructions WHERE instruction = ?")
      .all(instruction);
    expect(instructions).toHaveLength(1);

    const storedInstruction = instructions[0] as UserInstruction;
    expect(storedInstruction.context).toBe(context);
    expect(storedInstruction.rule_id).not.toBeNull();

    // Verify the rule was stored with embedding
    const rules = db
      .prepare("SELECT * FROM rules WHERE rule_text LIKE '%TypeScript%'")
      .all();
    expect(rules).toHaveLength(1);

    const storedRule = rules[0] as Rule & { embedding: Float32Array };
    expect(storedRule.category).toBeDefined();
    expect(storedRule.context).toBe(context);
    expect(storedRule.created_from_instruction_id).toBe(storedInstruction.id);
    expect(storedRule.embedding).toBeDefined(); // Should have embedding stored

    // Verify the embedding is a valid vector
    const embeddingLength = db
      .prepare("SELECT vec_length(embedding) as length FROM rules WHERE id = ?")
      .get(storedRule.id) as { length: number };
    expect(embeddingLength.length).toBe(1536);
  }, 60000); // 60 second timeout for complete flow
});
