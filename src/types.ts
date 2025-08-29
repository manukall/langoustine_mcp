/**
 * Represents a development rule that can be applied to future tasks.
 * Rules are generated from user instructions and stored with embeddings for similarity search.
 */
export type Rule = {
  /** Unique identifier for the rule */
  id: number;
  /** The text content of the rule */
  rule_text: string;
  /** The category/type of the rule (e.g., "style", "testing", "security") */
  category: string;
  /** The context in which the rule was created */
  context: string;
  /** Relevance score for the rule (defaults to 1.0) */
  relevance_score: number | null;
  /** ID of the instruction that created this rule */
  created_from_instruction_id: number | null;
  /** Timestamp when the rule was last applied */
  last_applied: Date | null;
  /** Number of times this rule has been referenced by instructions */
  instructions_count: number;
  /** Timestamp when the rule was created */
  inserted_at: Date;
};

/**
 * Represents a user instruction that can be remembered and applied to future tasks.
 * Instructions are linked to rules and provide context for rule generation.
 */
export type UserInstruction = {
  /** Unique identifier for the instruction */
  id: number;
  /** The instruction text provided by the user */
  instruction: string;
  /** The context in which the instruction was given */
  context: string;
  /** Timestamp when the instruction was created */
  inserted_at: Date;
  /** ID of the rule generated from this instruction (nullable until rule is created) */
  rule_id: number;
};
