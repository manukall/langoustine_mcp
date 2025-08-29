import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { SQLiteInstructionsRepo } from "./instructions-repo.js";
import { initializeDatabase } from "../database.js";
import { createTestConfig } from "../test-utils.js";
import Database from "better-sqlite3";
import { UserInstruction } from "../types.js";

const TEST_DB_PATH = ":memory:";

describe("SQLiteInstructionsRepo", () => {
  let db: Database.Database;
  let instructionsRepo: SQLiteInstructionsRepo;

  beforeEach(() => {
    const testConfig = createTestConfig({
      databasePath: TEST_DB_PATH,
    });
    db = initializeDatabase(testConfig);
    instructionsRepo = new SQLiteInstructionsRepo(db);
  });

  afterEach(() => {
    if (db) {
      db.close();
    }
  });

  describe("createInstruction", () => {
    it("should create a new instruction", async () => {
      const params = {
        instruction: "Use TypeScript for new files",
        context: "writing unit tests",
      };

      const instruction = await instructionsRepo.createInstruction(params);

      expect(instruction).toBeDefined();
      expect(instruction.instruction).toBe("Use TypeScript for new files");
      expect(instruction.context).toBe("writing unit tests");
      expect(instruction.rule_id).toBeNull(); // Initially null until linked to rule
      expect(instruction.inserted_at).toBeDefined();
    });

    it("should store instruction in database", async () => {
      const params = {
        instruction: "Write tests for all functions",
        context: "testing strategies",
      };

      const instruction = await instructionsRepo.createInstruction(params);

      // Verify instruction was stored in database
      const storedInstruction = db
        .prepare(
          "SELECT instruction, context, rule_id FROM user_instructions WHERE id = ?",
        )
        .get(instruction.id) as UserInstruction;

      expect(storedInstruction).toBeDefined();
      expect(storedInstruction.instruction).toBe(
        "Write tests for all functions",
      );
      expect(storedInstruction.context).toBe("testing strategies");
      expect(storedInstruction.rule_id).toBeNull();
    });
  });

  describe("findInstructionById", () => {
    it("should return null for non-existent instruction", () => {
      const instruction = instructionsRepo.findInstructionById(999);
      expect(instruction).toBeNull();
    });

    it("should return instruction for existing ID", async () => {
      const params = {
        instruction: "Use TypeScript for new files",
        context: "writing unit tests",
      };

      const createdInstruction =
        await instructionsRepo.createInstruction(params);
      const foundInstruction = instructionsRepo.findInstructionById(
        createdInstruction.id,
      );

      expect(foundInstruction).toBeDefined();
      expect(foundInstruction!.instruction).toBe(
        "Use TypeScript for new files",
      );
      expect(foundInstruction!.context).toBe("writing unit tests");
    });
  });

  describe("findInstructionsByRuleId", () => {
    it("should return empty array for non-existent rule", () => {
      const instructions = instructionsRepo.findInstructionsByRuleId(999);
      expect(instructions).toEqual([]);
    });

    it("should return instructions for existing rule", async () => {
      const instruction = await instructionsRepo.createInstruction({
        instruction: "Use TypeScript for new files",
        context: "writing unit tests",
      });

      // Create a rule first
      const ruleId = db
        .prepare(
          "INSERT INTO rules (rule_text, category, context, instructions_count, created_from_instruction_id) VALUES (?, ?, ?, ?, ?)",
        )
        .run("Test rule", "testing", "test context", 1, instruction.id)
        .lastInsertRowid as number;

      // Create multiple instructions
      const instruction1 = await instructionsRepo.createInstruction({
        instruction: "Use TypeScript",
        context: "development",
      });

      const instruction2 = await instructionsRepo.createInstruction({
        instruction: "Write tests",
        context: "testing",
      });

      // Update them to link to the same rule
      instructionsRepo.updateInstructionRuleId(instruction1.id, ruleId);
      instructionsRepo.updateInstructionRuleId(instruction2.id, ruleId);

      const instructions = instructionsRepo.findInstructionsByRuleId(ruleId);

      expect(instructions).toHaveLength(2);
      expect(instructions.map((i) => i.instruction)).toContain(
        "Use TypeScript",
      );
      expect(instructions.map((i) => i.instruction)).toContain("Write tests");
    });
  });

  describe("updateInstructionRuleId", () => {
    it("should update instruction rule_id", async () => {
      const instruction = await instructionsRepo.createInstruction({
        instruction: "Use TypeScript for new files",
        context: "writing unit tests",
      });

      expect(instruction.rule_id).toBeNull();

      // Create a rule first
      const ruleId = db
        .prepare(
          "INSERT INTO rules (rule_text, category, context, instructions_count, created_from_instruction_id) VALUES (?, ?, ?, ?, ?)",
        )
        .run("Test rule", "testing", "test context", 1, instruction.id)
        .lastInsertRowid as number;

      instructionsRepo.updateInstructionRuleId(instruction.id, ruleId);

      const updatedInstruction = instructionsRepo.findInstructionById(
        instruction.id,
      );
      expect(updatedInstruction!.rule_id).toBe(ruleId);
    });

    it("should update multiple instructions to same rule", async () => {
      const instruction1 = await instructionsRepo.createInstruction({
        instruction: "Use TypeScript",
        context: "development",
      });

      const instruction2 = await instructionsRepo.createInstruction({
        instruction: "Write tests",
        context: "testing",
      });

      // Create a rule first
      const ruleId = db
        .prepare(
          "INSERT INTO rules (rule_text, category, context, instructions_count, created_from_instruction_id) VALUES (?, ?, ?, ?, ?)",
        )
        .run("Test rule", "testing", "test context", 1, instruction1.id)
        .lastInsertRowid as number;

      instructionsRepo.updateInstructionRuleId(instruction1.id, ruleId);
      instructionsRepo.updateInstructionRuleId(instruction2.id, ruleId);

      const updatedInstruction1 = instructionsRepo.findInstructionById(
        instruction1.id,
      );
      const updatedInstruction2 = instructionsRepo.findInstructionById(
        instruction2.id,
      );

      expect(updatedInstruction1!.rule_id).toBe(ruleId);
      expect(updatedInstruction2!.rule_id).toBe(ruleId);
    });
  });
});
