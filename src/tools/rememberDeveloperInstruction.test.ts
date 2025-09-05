import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { rememberDeveloperInstructionHandler } from "./rememberDeveloperInstruction.js";
import { initializeDatabase } from "../database.js";
import { createTestConfig } from "../test-utils.js";
import { MockLLMClient, MockEmbeddingClient } from "../llm/index.js";
import Database from "better-sqlite3";
import { Rule, UserInstruction } from "../types.js";

const TEST_DB_PATH = ":memory:";

describe("rememberDeveloperInstruction tool", () => {
  let db: Database.Database;
  let mockLLMClient: MockLLMClient;
  let mockEmbeddingClient: MockEmbeddingClient;

  beforeEach(() => {
    const testConfig = createTestConfig({
      databasePath: TEST_DB_PATH,
    });
    db = initializeDatabase(testConfig);
    mockLLMClient = new MockLLMClient();
    mockEmbeddingClient = new MockEmbeddingClient();
  });

  afterEach(() => {
    if (db) {
      db.close();
    }
  });

  it("should store instruction and create rule with embedding", async () => {
    const instruction = "Always use TypeScript for new files";
    const context = "Creating new project files";

    // Mock LLM response
    mockLLMClient.setDefaultResponse({
      success: true,
      rule: {
        rule_text: "Use TypeScript for new files",
        category: "style",
      },
      reason: null,
      error: null,
    });

    const result = await rememberDeveloperInstructionHandler(
      { instruction, context },
      db,
      mockLLMClient,
      mockEmbeddingClient,
    );

    expect(result).toEqual({
      content: [
        {
          type: "text",
          text: 'Instruction processed successfully. Generated rule: "Use TypeScript for new files" (category: style). Rule ID: 1, Instruction ID: 1',
        },
      ],
    });

    // Verify instruction was stored
    const storedInstruction = db
      .prepare(
        "SELECT instruction, context, rule_id FROM user_instructions WHERE instruction = ?",
      )
      .get(instruction) as UserInstruction;

    expect(storedInstruction).toBeDefined();
    expect(storedInstruction.instruction).toBe(instruction);
    expect(storedInstruction.context).toBe(context);
    expect(storedInstruction.rule_id).toBe(1); // Should be linked to the rule

    // Verify rule was created with LLM-generated content and embedding
    const rule = db
      .prepare(
        "SELECT rule_text, category, instructions_count, vec_length(embedding) as embedding_length, created_from_instruction_id FROM rules WHERE id = ?",
      )
      .get(storedInstruction.rule_id) as {
      rule_text: string;
      category: string;
      instructions_count: number;
      embedding_length: number;
      created_from_instruction_id: number;
    };

    expect(rule).toBeDefined();
    expect(rule.rule_text).toBe("Use TypeScript for new files");
    expect(rule.category).toBe("style");
    expect(rule.instructions_count).toBe(1);
    expect(rule.embedding_length).toBe(1536);
    expect(rule.created_from_instruction_id).toBe(1);
  });

  it("should handle database errors gracefully", async () => {
    // Close database to simulate error
    db.close();

    const instruction = "This should fail";
    const context = "Testing error handling";

    // Mock LLM response
    mockLLMClient.setDefaultResponse({
      success: true,
      rule: {
        rule_text: "Test rule",
        category: "testing",
      },
      reason: null,
      error: null,
    });

    const result = await rememberDeveloperInstructionHandler(
      { instruction, context },
      db,
      mockLLMClient,
      mockEmbeddingClient,
    );

    expect(result.content[0].text).toContain("Failed to create instruction");
  });

  it("should store multiple instructions and rules", async () => {
    const instruction1 = "Use TypeScript";
    const instruction2 = "Write tests";
    const context = "Development practices";

    // Mock LLM responses
    mockLLMClient.setDefaultResponse({
      success: true,
      rule: {
        rule_text: "Use TypeScript",
        category: "style",
      },
      reason: null,
      error: null,
    });

    const result1 = await rememberDeveloperInstructionHandler(
      { instruction: instruction1, context },
      db,
      mockLLMClient,
      mockEmbeddingClient,
    );

    mockLLMClient.setDefaultResponse({
      success: true,
      rule: {
        rule_text: "Write tests",
        category: "testing",
      },
      reason: null,
      error: null,
    });

    const result2 = await rememberDeveloperInstructionHandler(
      { instruction: instruction2, context },
      db,
      mockLLMClient,
      mockEmbeddingClient,
    );

    expect(result1.content[0].text).toContain(
      "Instruction processed successfully",
    );
    expect(result2.content[0].text).toContain(
      "Instruction processed successfully",
    );

    // Verify both instructions were stored
    const stored1 = db
      .prepare(
        "SELECT instruction FROM user_instructions WHERE instruction = ?",
      )
      .get(instruction1);
    const stored2 = db
      .prepare(
        "SELECT instruction FROM user_instructions WHERE instruction = ?",
      )
      .get(instruction2);

    expect(stored1).toBeDefined();
    expect(stored2).toBeDefined();

    // Verify both rules were created
    const rules = db.prepare("SELECT rule_text FROM rules").all() as Rule[];
    expect(rules).toHaveLength(2);
  });

  it("should handle LLM generation failure", async () => {
    const instruction = "This should fail";
    const context = "Testing LLM failure";

    // Mock LLM failure
    mockLLMClient.setDefaultResponse({
      success: false,
      rule: null,
      reason: null,
      error: "LLM service unavailable",
    });

    const result = await rememberDeveloperInstructionHandler(
      { instruction, context },
      db,
      mockLLMClient,
      mockEmbeddingClient,
    );

    expect(result.content[0].text).toContain(
      "Failed to generate abstract rule",
    );
    expect(result.content[0].text).toContain("LLM service unavailable");
  });

  it("should handle embedding generation failure", async () => {
    const instruction = "This should fail";
    const context = "Testing embedding failure";

    // Mock LLM success
    mockLLMClient.setDefaultResponse({
      success: true,
      rule: {
        rule_text: "Test rule",
        category: "testing",
      },
      reason: null,
      error: null,
    });

    // Mock embedding failure
    mockEmbeddingClient.setShouldFail(true);

    const result = await rememberDeveloperInstructionHandler(
      { instruction, context },
      db,
      mockLLMClient,
      mockEmbeddingClient,
    );

    expect(result.content[0].text).toContain(
      "Failed to create rule with embedding",
    );
  });

  it("should skip DB writes when instruction is not generalizable", async () => {
    const instruction = "Move the button 3 px right";
    const context = "UI tweak";

    // Mock LLM non-generalizable response
    mockLLMClient.setDefaultResponse({
      success: true,
      rule: null,
      reason: "Too specific: pixel-level adjustment",
      error: null,
    });

    const result = await rememberDeveloperInstructionHandler(
      { instruction, context },
      db,
      mockLLMClient,
      mockEmbeddingClient,
    );

    expect(result.content[0].text).toContain("No rule generated.");

    // Verify no instruction stored
    const storedInstruction = db
      .prepare("SELECT id FROM user_instructions WHERE instruction = ?")
      .get(instruction);
    expect(storedInstruction).toBeUndefined();

    // Verify no rules stored
    const rules = db.prepare("SELECT id FROM rules").all();
    expect(rules.length).toBe(0);
  });
});
