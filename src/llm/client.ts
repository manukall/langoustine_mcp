export interface LLMClient {
  generateRule(
    instruction: string,
    context: string,
  ): Promise<RuleGenerationResult>;
}

export interface RuleGenerationResult {
  success: boolean;
  // If generalizable, returns the abstract rule and category.
  // If not generalizable, returns null and a reason.
  rule: {
    rule_text: string;
    category: string;
  } | null;
  reason: string | null; // present when rule is null, explains non-generalizability
  error: string | null; // present when success is false (API/parse failure)
}

export interface LLMConfig {
  apiKey?: string;
  model?: string;
  maxRetries?: number;
  retryDelay?: number;
}
