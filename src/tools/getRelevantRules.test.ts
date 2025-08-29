import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { getRelevantRulesHandler } from "./getRelevantRules.js";
import { initializeDatabase } from "../database.js";
import { createTestConfig } from "../test-utils.js";
import { MockEmbeddingClient } from "../llm/index.js";
import Database from "better-sqlite3";

const TEST_DB_PATH = ":memory:";

describe("getRelevantRulesHandler", () => {
  let db: Database.Database;
  let mockEmbeddingClient: MockEmbeddingClient;

  beforeEach(() => {
    const testConfig = createTestConfig({
      databasePath: TEST_DB_PATH,
    });
    db = initializeDatabase(testConfig);
    mockEmbeddingClient = new MockEmbeddingClient();
  });

  afterEach(() => {
    if (db) {
      db.close();
    }
  });

  describe("input validation", () => {
    it("should reject empty task description", async () => {
      const result = await getRelevantRulesHandler(
        { taskDescription: "" },
        db,
        mockEmbeddingClient,
      );

      expect(result.content[0].text).toContain(
        "Error: taskDescription cannot be empty",
      );
    });

    it("should reject whitespace-only task description", async () => {
      const result = await getRelevantRulesHandler(
        { taskDescription: "   " },
        db,
        mockEmbeddingClient,
      );

      expect(result.content[0].text).toContain(
        "Error: taskDescription cannot be empty",
      );
    });

    it("should reject maxResults less than 1", async () => {
      const result = await getRelevantRulesHandler(
        { taskDescription: "test task", maxResults: 0 },
        db,
        mockEmbeddingClient,
      );

      expect(result.content[0].text).toContain(
        "Error: maxResults must be between 1 and 100",
      );
    });

    it("should reject maxResults greater than 20", async () => {
      const result = await getRelevantRulesHandler(
        { taskDescription: "test task", maxResults: 101 },
        db,
        mockEmbeddingClient,
      );

      expect(result.content[0].text).toContain(
        "Error: maxResults must be between 1 and 100",
      );
    });

    it("should reject similarityThreshold less than 0", async () => {
      const result = await getRelevantRulesHandler(
        { taskDescription: "test task", similarityThreshold: -1.1 },
        db,
        mockEmbeddingClient,
      );

      expect(result.content[0].text).toContain(
        "Error: similarityThreshold must be between -1 and 1",
      );
    });

    it("should reject similarityThreshold greater than 1", async () => {
      const result = await getRelevantRulesHandler(
        { taskDescription: "test task", similarityThreshold: 1.1 },
        db,
        mockEmbeddingClient,
      );

      expect(result.content[0].text).toContain(
        "Error: similarityThreshold must be between -1 and 1",
      );
    });
  });

  describe("embedding generation", () => {
    it("should handle embedding generation failure", async () => {
      mockEmbeddingClient.setShouldFail(true);

      const result = await getRelevantRulesHandler(
        { taskDescription: "test task" },
        db,
        mockEmbeddingClient,
      );

      expect(result.content[0].text).toContain(
        "Failed to generate embedding for task description",
      );
    });
  });

  describe("rule retrieval", () => {
    it("should return no rules message when no rules exist", async () => {
      const result = await getRelevantRulesHandler(
        { taskDescription: "test task" },
        db,
        mockEmbeddingClient,
      );

      expect(result.content[0].text).toContain(
        "No relevant rules found for task description",
      );
      expect(result.content[0].text).toContain("test task");
    });

    it("should return relevant rules when they exist", async () => {
      // Create a rule with high similarity
      const instructionId = db
        .prepare(
          "INSERT INTO user_instructions (instruction, context) VALUES (?, ?)",
        )
        .run("Test instruction", "test context").lastInsertRowid as number;

      const ruleEmbedding = new Float32Array(1536).fill(0.8); // High similarity
      mockEmbeddingClient.setCustomEmbedding(ruleEmbedding);

      // Insert rule directly
      db.prepare(
        "INSERT INTO rules (rule_text, category, context, instructions_count, embedding, created_from_instruction_id) VALUES (?, ?, ?, ?, ?, ?)",
      ).run(
        "Write unit tests for all new features",
        "testing",
        "testing strategies",
        1,
        Buffer.from(ruleEmbedding.buffer),
        instructionId,
      );

      // Search for similar task
      const result = await getRelevantRulesHandler(
        {
          taskDescription:
            "implement a new api endpoint, write unit tests for it",
        },
        db,
        mockEmbeddingClient,
      );

      expect(result.content[0].text).toContain(
        "Found 1 relevant rules for task",
      );
      expect(result.content[0].text).toContain(
        "Write unit tests for all new features",
      );
      expect(result.content[0].text).toContain("category: testing");
    });

    it("should use default parameters when not provided", async () => {
      // Create a rule
      const instructionId = db
        .prepare(
          "INSERT INTO user_instructions (instruction, context) VALUES (?, ?)",
        )
        .run("Test instruction", "test context").lastInsertRowid as number;

      const ruleEmbedding = new Float32Array(1536).fill(0.8);
      mockEmbeddingClient.setCustomEmbedding(ruleEmbedding);

      // Insert rule directly
      db.prepare(
        "INSERT INTO rules (rule_text, category, context, instructions_count, embedding, created_from_instruction_id) VALUES (?, ?, ?, ?, ?, ?)",
      ).run(
        "Test rule",
        "testing",
        "unit tests",
        1,
        Buffer.from(ruleEmbedding.buffer),
        instructionId,
      );

      // Search with only taskDescription (should use defaults: maxResults=5, similarityThreshold=0.7)
      const result = await getRelevantRulesHandler(
        { taskDescription: "test task" },
        db,
        mockEmbeddingClient,
      );

      expect(result.content[0].text).toContain(
        "Found 1 relevant rules for task",
      );
    });
  });

  describe("error handling", () => {
    it("should handle unexpected errors gracefully", async () => {
      // Mock a database error by closing the connection
      db.close();

      const result = await getRelevantRulesHandler(
        { taskDescription: "test task" },
        db,
        mockEmbeddingClient,
      );

      expect(result.content[0].text).toContain("Unexpected error");
    });
  });
});
