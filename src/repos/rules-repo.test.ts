import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { SQLiteRulesRepo } from "./rules-repo.js";
import { initializeDatabase } from "../database.js";
import { createTestConfig } from "../test-utils.js";
import { MockEmbeddingClient } from "../llm/index.js";
import Database from "better-sqlite3";

const TEST_DB_PATH = ":memory:";

describe("SQLiteRulesRepo", () => {
  let db: Database.Database;
  let mockEmbeddingClient: MockEmbeddingClient;
  let rulesRepo: SQLiteRulesRepo;

  beforeEach(() => {
    const testConfig = createTestConfig({
      databasePath: TEST_DB_PATH,
    });
    db = initializeDatabase(testConfig);
    mockEmbeddingClient = new MockEmbeddingClient();
    rulesRepo = new SQLiteRulesRepo(db, mockEmbeddingClient);
  });

  afterEach(() => {
    if (db) {
      db.close();
    }
  });

  describe("createRule", () => {
    it("should create a new rule with embedding", async () => {
      // Create an instruction first
      const instructionId = db
        .prepare(
          "INSERT INTO user_instructions (instruction, context) VALUES (?, ?)",
        )
        .run("Test instruction", "test context").lastInsertRowid as number;

      const params = {
        ruleText: "Use TypeScript for new files",
        category: "style",
        context: "writing unit tests",
        createdFromInstructionId: instructionId,
      };

      const rule = await rulesRepo.createRule(params);

      expect(rule).toBeDefined();
      expect(rule.rule_text).toBe("Use TypeScript for new files");
      expect(rule.category).toBe("style");
      expect(rule.instructions_count).toBe(1);
      expect(rule.created_from_instruction_id).toBe(1);
    });

    it("should handle embedding generation failure", async () => {
      mockEmbeddingClient.setShouldFail(true);

      const params = {
        ruleText: "Use TypeScript for new files",
        category: "style",
        context: "writing unit tests",
        createdFromInstructionId: 1,
      };

      await expect(rulesRepo.createRule(params)).rejects.toThrow(
        "Failed to generate embedding: Mock embedding generation failed",
      );
    });

    it("should store embedding in database", async () => {
      const customEmbedding = new Float32Array(1536).fill(0.5);
      mockEmbeddingClient.setCustomEmbedding(customEmbedding);

      // Create an instruction first
      const instructionId = db
        .prepare(
          "INSERT INTO user_instructions (instruction, context) VALUES (?, ?)",
        )
        .run("Test instruction", "test context").lastInsertRowid as number;

      const params = {
        ruleText: "Use TypeScript for new files",
        category: "style",
        context: "writing unit tests",
        createdFromInstructionId: instructionId,
      };

      const rule = await rulesRepo.createRule(params);

      // Verify embedding was stored correctly
      const storedRule = db
        .prepare(
          "SELECT vec_length(embedding) as length FROM rules WHERE id = ?",
        )
        .get(rule.id) as { length: number };

      expect(storedRule.length).toBe(1536);
    });
  });

  describe("findRuleById", () => {
    it("should return null for non-existent rule", () => {
      const rule = rulesRepo.findRuleById(999);
      expect(rule).toBeNull();
    });

    it("should return rule for existing ID", async () => {
      // Create an instruction first
      const instructionId = db
        .prepare(
          "INSERT INTO user_instructions (instruction, context) VALUES (?, ?)",
        )
        .run("Test instruction", "test context").lastInsertRowid as number;

      const params = {
        ruleText: "Use TypeScript for new files",
        category: "style",
        context: "writing unit tests",
        createdFromInstructionId: instructionId,
      };

      const createdRule = await rulesRepo.createRule(params);
      const foundRule = rulesRepo.findRuleById(createdRule.id);

      expect(foundRule).toBeDefined();
      expect(foundRule!.rule_text).toBe("Use TypeScript for new files");
      expect(foundRule!.category).toBe("style");
    });
  });

  describe("findSimilarRules", () => {
    it("should return empty array when no rules exist", async () => {
      const searchEmbedding = new Float32Array(1536).fill(0.1);
      const similarRules = await rulesRepo.findSimilarRules(
        searchEmbedding,
        5,
        0.7,
      );

      expect(similarRules).toEqual([]);
    });

    it("should return rules with relevance scores", async () => {
      // Create a test rule
      const instructionId = db
        .prepare(
          "INSERT INTO user_instructions (instruction, context) VALUES (?, ?)",
        )
        .run("Test instruction", "test context").lastInsertRowid as number;

      const ruleEmbedding = new Float32Array(1536).fill(0.8);
      mockEmbeddingClient.setCustomEmbedding(ruleEmbedding);

      await rulesRepo.createRule({
        ruleText: "Test rule",
        category: "testing",
        context: "unit tests",
        createdFromInstructionId: instructionId,
      });

      // Search with similar embedding
      const searchEmbedding = new Float32Array(1536).fill(0.8);
      const similarRules = await rulesRepo.findSimilarRules(
        searchEmbedding,
        5,
        0.5,
      );

      expect(similarRules.length).toBeGreaterThan(0);
      expect(similarRules[0].relevance_score).toBeDefined();
      expect(similarRules[0].relevance_score).toBeGreaterThan(0);
      expect(similarRules[0].relevance_score).toBeLessThanOrEqual(1);
    });

    it("should respect limit parameter", async () => {
      // Create multiple test rules
      const instructionIds = [];
      for (let i = 0; i < 3; i++) {
        const id = db
          .prepare(
            "INSERT INTO user_instructions (instruction, context) VALUES (?, ?)",
          )
          .run(`Test instruction ${i}`, "test context")
          .lastInsertRowid as number;
        instructionIds.push(id);
      }

      // Create rules with similar embeddings
      const ruleEmbedding = new Float32Array(1536).fill(0.7);
      mockEmbeddingClient.setCustomEmbedding(ruleEmbedding);

      for (let i = 0; i < 3; i++) {
        await rulesRepo.createRule({
          ruleText: `Test rule ${i}`,
          category: "testing",
          context: "unit tests",
          createdFromInstructionId: instructionIds[i],
        });
      }

      // Search with limit of 2
      const searchEmbedding = new Float32Array(1536).fill(0.7);
      const similarRules = await rulesRepo.findSimilarRules(
        searchEmbedding,
        2, // Limit to 2 results
        0.5,
      );

      expect(similarRules.length).toEqual(2);
    });
  });
});
