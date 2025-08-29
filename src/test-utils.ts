/**
 * Test utilities for the Langoustine MCP Server
 * Contains helper functions used across test files
 */

import type { Config } from "./config.js";

/**
 * Get default configuration values (same as production defaults)
 */
function getTestDefaults(): Config {
  return {
    databasePath: "./.langoustine/langoustine.db",
    showHelp: false,
    // openaiApiKey is undefined by default - must be provided via env var or CLI
    llmModel: "gpt-5-mini-2025-08-07",
    llmMaxRetries: 3,
    llmRetryDelay: 1000,
    embeddingModel: "text-embedding-3-small",
    embeddingMaxRetries: 3,
    embeddingRetryDelay: 1000,
  };
}

/**
 * Create a config object from partial values, filling in defaults for missing fields
 * Useful for testing where you only want to specify relevant fields
 */
export function createTestConfig(partial: Partial<Config> = {}): Config {
  const defaults = getTestDefaults();
  return {
    ...defaults,
    ...partial,
  };
}
