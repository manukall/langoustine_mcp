import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { initializeDatabase } from "../database.js";
import { createTestConfig } from "../test-utils.js";
import { getRelevantRulesHandler } from "./getRelevantRules.js";
import { OpenAIEmbeddingClient } from "../llm/embedding-client.js";
import { OpenAIClient } from "../llm/openai-client.js";
import Database from "better-sqlite3";

// Only run integration tests if explicitly requested
const shouldRunIntegrationTests = process.env.RUN_INTEGRATION_TESTS === "true";

// Skip all tests if integration testing is not enabled
const testFn = shouldRunIntegrationTests ? describe : describe.skip;

const testDbPath = `:memory:`;

testFn("getRelevantRules End-to-End Integration Tests", () => {
  let db: Database.Database;
  let embeddingClient: OpenAIEmbeddingClient;
  let llmClient: OpenAIClient;

  beforeAll(() => {
    // Verify we have the required environment variables
    if (!process.env.TESTING_OPENAI_API_KEY) {
      throw new Error(
        "TESTING_OPENAI_API_KEY environment variable is required for integration tests",
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
      openaiApiKey: process.env.TESTING_OPENAI_API_KEY,
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

  it("should find relevant rules for a given task description", async () => {
    // First, create some test rules by processing instructions
    const testInstructions = [
      {
        instruction: "Always use TypeScript for new files",
        context: "writing unit tests",
      },
      {
        instruction: "Include a single assert in each test",
        context: "testing strategies",
      },
      {
        instruction: "Use descriptive variable names",
        context: "naming variables and functions",
      },
    ];

    // Process each instruction to create rules
    for (const { instruction, context } of testInstructions) {
      const { rememberDeveloperInstructionHandler } = await import(
        "./rememberDeveloperInstruction.js"
      );
      await rememberDeveloperInstructionHandler(
        { instruction, context },
        db,
        llmClient,
        embeddingClient,
      );
    }

    // Now test getRelevantRules with a task description
    const taskDescription =
      "Write a unit test for a function that returns the sum of two numbers";

    const result = await getRelevantRulesHandler(
      { taskDescription, maxResults: 3, similarityThreshold: 0.0 },
      db,
      embeddingClient,
    );

    expect(result.content).toHaveLength(1);
    expect(result.content[0].type).toBe("text");
    expect(result.content[0].text).toContain("Found");
    expect(result.content[0].text).toContain("relevant rules");

    // Verify that rules were found (should find at least one rule)
    const rulesText = result.content[0].text;
    expect(rulesText).toMatch(/Found \d+ relevant rules/);

    // Should contain rule information
    expect(rulesText).toContain("category:");
    expect(rulesText).toContain("relevance:");
  }, 60000); // 60 second timeout for complete flow
});
