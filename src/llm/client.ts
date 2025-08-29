export interface LLMClient {
  generateRule(
    instruction: string,
    context: string,
  ): Promise<RuleGenerationResult>;
}

export interface RuleGenerationResult {
  success: boolean;
  rule?: {
    rule_text: string;
    category: string;
  };
  error?: string;
}

export interface LLMConfig {
  apiKey?: string;
  model?: string;
  maxRetries?: number;
  retryDelay?: number;
}
