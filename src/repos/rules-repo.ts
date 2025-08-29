import Database from "better-sqlite3";
import { EmbeddingClient } from "../llm/index.js";
import { Rule } from "../types.js";

/**
 * Represents a rule with relevance score for similarity search results.
 */
export interface RelevantRule extends Rule {
  /** Similarity score from vector search (0-1) */
  relevance_score: number;
}

/**
 * Parameters for creating a new rule.
 */
export interface CreateRuleParams {
  /** The text content of the rule */
  ruleText: string;
  /** The category/type of the rule */
  category: string;
  /** The context in which the rule was created */
  context: string;
  /** ID of the instruction that created this rule */
  createdFromInstructionId: number;
}

/**
 * Interface for rule repository operations.
 * Provides methods for creating and retrieving rules with embedding generation.
 */
export interface RulesRepo {
  /**
   * Creates a new rule with an automatically generated embedding.
   * @param params - Parameters for creating the rule
   * @returns Promise that resolves to the created Rule
   * @throws Error if embedding generation fails
   */
  createRule(params: CreateRuleParams): Promise<Rule>;

  /**
   * Finds a rule by its ID.
   * @param id - The ID of the rule to find
   * @returns The rule if found, null otherwise
   */
  findRuleById(id: number): Rule | null;

  /**
   * Finds rules similar to the given embedding using vector similarity search.
   * @param embedding - The embedding to search for similar rules
   * @param limit - Maximum number of rules to return
   * @param threshold - Minimum similarity score (0-1)
   * @returns Promise that resolves to an array of relevant rules ordered by similarity
   */
  findSimilarRules(
    embedding: Float32Array,
    limit: number,
    threshold: number,
  ): Promise<RelevantRule[]>;
}

/**
 * SQLite implementation of the RulesRepo interface.
 * Handles rule creation with embedding generation and storage.
 */
export class SQLiteRulesRepo implements RulesRepo {
  /**
   * Creates a new SQLiteRulesRepo instance.
   * @param db - SQLite database connection
   * @param embeddingClient - Client for generating embeddings
   */
  constructor(
    private db: Database.Database,
    private embeddingClient: EmbeddingClient,
  ) {}

  /**
   * Creates a new rule with an automatically generated embedding.
   * The operation is atomic - if embedding generation fails, no rule is created.
   * @param params - Parameters for creating the rule
   * @returns Promise that resolves to the created Rule
   * @throws Error if embedding generation fails
   */
  async createRule(params: CreateRuleParams): Promise<Rule> {
    const { ruleText, category, context, createdFromInstructionId } = params;

    // Step 1: Generate embedding for the rule text
    const embeddingResult =
      await this.embeddingClient.generateEmbedding(ruleText);

    if (!embeddingResult.success || !embeddingResult.embedding) {
      throw new Error(`Failed to generate embedding: ${embeddingResult.error}`);
    }

    // Step 2: Create new rule with embedding
    const insertRule = this.db.prepare(
      "INSERT INTO rules (rule_text, category, context, instructions_count, embedding, created_from_instruction_id) VALUES (?, ?, ?, ?, ?, ?)",
    );
    const ruleResult = insertRule.run(
      ruleText,
      category,
      context,
      1,
      Buffer.from(embeddingResult.embedding.buffer),
      createdFromInstructionId,
    );
    const ruleId = ruleResult.lastInsertRowid as number;

    // Return the newly created rule
    return this.findRuleById(ruleId)!;
  }

  /**
   * Finds a rule by its ID.
   * @param id - The ID of the rule to find
   * @returns The rule if found, null otherwise
   */
  findRuleById(id: number): Rule | null {
    const rule = this.db
      .prepare(
        "SELECT id, rule_text, category, context, relevance_score, created_from_instruction_id, last_applied, instructions_count, inserted_at FROM rules WHERE id = ?",
      )
      .get(id) as Rule | undefined;

    return rule || null;
  }

  /**
   * Finds rules similar to the given embedding using vector similarity search.
   * Uses cosine similarity to find the most relevant rules.
   * @param embedding - The embedding to search for similar rules
   * @param limit - Maximum number of rules to return
   * @param threshold - Minimum similarity score (0-1)
   * @returns Promise that resolves to an array of relevant rules ordered by similarity
   */
  async findSimilarRules(
    embedding: Float32Array,
    limit: number,
    threshold: number,
  ): Promise<RelevantRule[]> {
    // Convert embedding to buffer for database storage
    const embeddingBuffer = Buffer.from(embedding.buffer);

    // Query for similar rules using cosine similarity
    const similarRules = this.db
      .prepare(
        `SELECT 
            id, 
            rule_text, 
            category, 
            context, 
            (1 - vec_distance_cosine(embedding, ?)) as relevance_score,
            created_from_instruction_id, 
            last_applied, 
            instructions_count, 
            inserted_at 
          FROM rules 
          WHERE (1 - vec_distance_cosine(embedding, ?)) >= ? 
          ORDER BY relevance_score DESC 
          LIMIT ?`,
      )
      .all(
        embeddingBuffer,
        embeddingBuffer,
        threshold,
        limit,
      ) as RelevantRule[];

    return similarRules;
  }
}
