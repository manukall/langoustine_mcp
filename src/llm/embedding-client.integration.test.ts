import { describe, it, expect, beforeAll } from "vitest";
import { OpenAIEmbeddingClient } from "./embedding-client.js";
import { createTestConfig } from "../test-utils.js";

// Only run integration tests if explicitly requested
const shouldRunIntegrationTests = process.env.RUN_INTEGRATION_TESTS === "true";

// Skip all tests if integration testing is not enabled
const testFn = shouldRunIntegrationTests ? describe : describe.skip;

testFn("OpenAIEmbeddingClient Integration Tests", () => {
  let embeddingClient: OpenAIEmbeddingClient;

  beforeAll(() => {
    // Verify we have the required environment variables
    if (!process.env.TESTING_OPENAI_API_KEY) {
      throw new Error(
        "TESTING_OPENAI_API_KEY environment variable is required for integration tests",
      );
    }

    const testConfig = createTestConfig({
      embeddingModel: "text-embedding-3-small",
      embeddingMaxRetries: 2,
      embeddingRetryDelay: 1000,
      openaiApiKey: process.env.TESTING_OPENAI_API_KEY,
    });

    embeddingClient = new OpenAIEmbeddingClient(testConfig);
  });

  it("should generate embeddings", async () => {
    const text = `This is a more complex piece of text that should generate a meaningful embedding. 
    It contains multiple sentences and various types of content including technical terms like "API", 
    "database", and "TypeScript". The embedding should capture the semantic meaning of this text.`;
    const result = await embeddingClient.generateEmbedding(text);

    expect(result.success).toBe(true);
    expect(result.embedding).toBeDefined();
    expect(result.embedding).toBeInstanceOf(Float32Array);
    expect(result.embedding!.length).toBe(1536);
    expect(result.error).toBeUndefined();
  }, 30000);
});
