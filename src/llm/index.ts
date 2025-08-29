/**
 * LLM (Large Language Model) module exports.
 * Provides interfaces and implementations for rule generation and embedding creation.
 */

// LLM Client exports
export type { LLMClient, RuleGenerationResult, LLMConfig } from "./client.js";
export { OpenAIClient } from "./openai-client.js";
export { MockLLMClient } from "./mock-client.js";

// Embedding Client exports
export type {
  EmbeddingClient,
  EmbeddingResult,
  EmbeddingConfig,
} from "./embedding-client.js";
export { OpenAIEmbeddingClient } from "./embedding-client.js";
export {
  MockEmbeddingClient,
  createSuccessfulMockEmbeddingClient,
  createFailingMockEmbeddingClient,
  createRetryMockEmbeddingClient,
} from "./mock-embedding-client.js";
