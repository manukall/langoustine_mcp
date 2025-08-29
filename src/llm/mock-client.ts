import { LLMClient, RuleGenerationResult } from "./client.js";

export class MockLLMClient implements LLMClient {
  private responses: Array<{
    instruction: string;
    context: string;
    result: RuleGenerationResult;
  }> = [];

  // Method to set up expected responses for testing
  setResponse(
    instruction: string,
    context: string,
    result: RuleGenerationResult,
  ): void {
    this.responses.push({ instruction, context, result });
  }

  // Method to set up a default response for any input
  setDefaultResponse(result: RuleGenerationResult): void {
    this.responses.push({
      instruction: "*",
      context: "*",
      result,
    });
  }

  async generateRule(
    instruction: string,
    context: string,
  ): Promise<RuleGenerationResult> {
    // Look for exact match first
    let response = this.responses.find(
      (r) => r.instruction === instruction && r.context === context,
    );

    // If no exact match, look for wildcard responses
    if (!response) {
      response = this.responses.find(
        (r) => r.instruction === "*" || r.context === "*",
      );
    }

    if (response) {
      return response.result;
    }

    // Default fallback response
    return {
      success: true,
      rule: {
        rule_text: instruction,
        category: "best-practices",
      },
    };
  }

  // Method to clear all responses
  clear(): void {
    this.responses = [];
  }

  // Method to get all configured responses (for debugging)
  getResponses(): Array<{
    instruction: string;
    context: string;
    result: RuleGenerationResult;
  }> {
    return [...this.responses];
  }
}
