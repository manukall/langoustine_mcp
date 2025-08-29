import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { initializeDatabase } from "./database.js";
import { createTestConfig } from "./test-utils.js";
import Database from "better-sqlite3";

const TEST_DB_PATH = ":memory:";

describe("Database functionality", () => {
  let db: Database.Database;

  beforeEach(() => {
    const testConfig = createTestConfig({
      databasePath: TEST_DB_PATH,
    });
    db = initializeDatabase(testConfig);
  });

  afterEach(() => {
    if (db) {
      db.close();
    }
  });

  it("should connect to database successfully", () => {
    expect(db).toBeDefined();
    expect(db.open).toBe(true);
  });

  it("should create user_instructions table", () => {
    const tableExists = db
      .prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='user_instructions'",
      )
      .get();
    expect(tableExists).toBeDefined();
  });

  it("should have correct table schema", () => {
    const instructionsSchema = db
      .prepare("PRAGMA table_info(user_instructions)")
      .all() as { name: string }[];
    const rulesSchema = db.prepare("PRAGMA table_info(rules)").all() as {
      name: string;
    }[];

    expect(instructionsSchema).toHaveLength(5); // id, instruction, context, inserted_at, rule_id
    expect(rulesSchema).toHaveLength(10); // id, rule_text, category, context, relevance_score, embedding, created_from_instruction_id, last_applied, instructions_count, inserted_at

    // Check specific columns exist
    const instructionColumns = instructionsSchema.map(
      (col: { name: string }) => col.name,
    );
    expect(instructionColumns).toContain("instruction");
    expect(instructionColumns).toContain("context");
    expect(instructionColumns).toContain("rule_id");

    const ruleColumns = rulesSchema.map((col: { name: string }) => col.name);
    expect(ruleColumns).toContain("rule_text");
    expect(ruleColumns).toContain("category");
    expect(ruleColumns).toContain("context");
  });
});
