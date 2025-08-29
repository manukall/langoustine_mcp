import Database from "better-sqlite3";
import { UserInstruction } from "../types.js";

/**
 * Parameters for creating a new user instruction.
 */
export interface CreateInstructionParams {
  /** The instruction text provided by the user */
  instruction: string;
  /** The context in which the instruction was given */
  context: string;
}

/**
 * Interface for user instruction repository operations.
 * Provides methods for creating, finding, and updating user instructions.
 */
export interface InstructionsRepo {
  /**
   * Creates a new user instruction.
   * @param params - Parameters for creating the instruction
   * @returns Promise that resolves to the created UserInstruction
   */
  createInstruction(params: CreateInstructionParams): Promise<UserInstruction>;

  /**
   * Finds a user instruction by its ID.
   * @param id - The ID of the instruction to find
   * @returns The instruction if found, null otherwise
   */
  findInstructionById(id: number): UserInstruction | null;

  /**
   * Finds all user instructions associated with a specific rule.
   * @param ruleId - The ID of the rule to find instructions for
   * @returns Array of UserInstruction objects
   */
  findInstructionsByRuleId(ruleId: number): UserInstruction[];

  /**
   * Updates the rule_id field of an instruction to link it to a rule.
   * @param instructionId - The ID of the instruction to update
   * @param ruleId - The ID of the rule to link to
   */
  updateInstructionRuleId(instructionId: number, ruleId: number): void;
}

/**
 * SQLite implementation of the InstructionsRepo interface.
 * Handles user instruction storage and retrieval operations.
 */
export class SQLiteInstructionsRepo implements InstructionsRepo {
  /**
   * Creates a new SQLiteInstructionsRepo instance.
   * @param db - SQLite database connection
   */
  constructor(private db: Database.Database) {}

  /**
   * Creates a new user instruction.
   * Initially creates the instruction with rule_id set to null.
   * The rule_id should be updated later using updateInstructionRuleId.
   * @param params - Parameters for creating the instruction
   * @returns Promise that resolves to the created UserInstruction
   */
  async createInstruction(
    params: CreateInstructionParams,
  ): Promise<UserInstruction> {
    const { instruction, context } = params;

    const insertInstruction = this.db.prepare(
      "INSERT INTO user_instructions (instruction, context, rule_id) VALUES (?, ?, ?)",
    );
    const instructionResult = insertInstruction.run(instruction, context, null);
    const instructionId = instructionResult.lastInsertRowid as number;

    // Return the created instruction
    return this.findInstructionById(instructionId)!;
  }

  /**
   * Finds a user instruction by its ID.
   * @param id - The ID of the instruction to find
   * @returns The instruction if found, null otherwise
   */
  findInstructionById(id: number): UserInstruction | null {
    const instruction = this.db
      .prepare(
        "SELECT id, instruction, context, inserted_at, rule_id FROM user_instructions WHERE id = ?",
      )
      .get(id) as UserInstruction | undefined;

    return instruction || null;
  }

  /**
   * Finds all user instructions associated with a specific rule.
   * @param ruleId - The ID of the rule to find instructions for
   * @returns Array of UserInstruction objects
   */
  findInstructionsByRuleId(ruleId: number): UserInstruction[] {
    const instructions = this.db
      .prepare(
        "SELECT id, instruction, context, inserted_at, rule_id FROM user_instructions WHERE rule_id = ?",
      )
      .all(ruleId) as UserInstruction[];

    return instructions;
  }

  /**
   * Updates the rule_id field of an instruction to link it to a rule.
   * This creates a relationship between the instruction and the rule.
   * @param instructionId - The ID of the instruction to update
   * @param ruleId - The ID of the rule to link to
   */
  updateInstructionRuleId(instructionId: number, ruleId: number): void {
    this.db
      .prepare("UPDATE user_instructions SET rule_id = ? WHERE id = ?")
      .run(ruleId, instructionId);
  }
}
