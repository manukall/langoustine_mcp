import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { OpenAIEmbeddingClient } from "./embedding-client.js";
import { createTestConfig } from "../test-utils.js";

// Mock the OpenAI SDK
vi.mock("openai", () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      embeddings: {
        create: vi.fn(),
      },
    })),
  };
});

describe("OpenAIEmbeddingClient", () => {
  const mockApiKey = "test-api-key";
  const mockModel = "text-embedding-3-small";
  const mockText = "test text for embedding";

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset environment variables
    delete process.env.LANGOUSTINE_MCP_OPENAI_API_KEY;
    delete process.env.OPENAI_EMBEDDING_MODEL;
    delete process.env.EMBEDDING_MAX_RETRIES;
    delete process.env.EMBEDDING_RETRY_DELAY;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("generateEmbedding", () => {
    it("should successfully generate embedding", async () => {
      const mockEmbedding = new Array(1536).fill(0.1);
      const mockResponse = {
        data: [{ embedding: mockEmbedding }],
      };

      const { default: OpenAI } = await import("openai");
      const mockOpenAI = OpenAI as typeof OpenAI & {
        mockImplementation: (impl: () => unknown) => void;
      };
      const mockCreate = vi.fn().mockResolvedValue(mockResponse);
      mockOpenAI.mockImplementation(() => ({
        embeddings: {
          create: mockCreate,
        },
      }));

      const client = new OpenAIEmbeddingClient(
        createTestConfig({ openaiApiKey: mockApiKey }),
      );
      const result = await client.generateEmbedding(mockText);

      expect(result.success).toBe(true);
      expect(result.embedding).toEqual(new Float32Array(mockEmbedding));
      expect(result.error).toBeUndefined();

      expect(mockCreate).toHaveBeenCalledWith({
        model: mockModel,
        input: mockText,
      });
    });

    it("should handle API error response", async () => {
      const mockError = new Error("Invalid input");

      const { default: OpenAI } = await import("openai");
      const mockOpenAI = OpenAI as unknown as {
        mockImplementation: (impl: () => unknown) => void;
      };
      const mockCreate = vi.fn().mockRejectedValue(mockError);
      mockOpenAI.mockImplementation(() => ({
        embeddings: {
          create: mockCreate,
        },
      }));

      const client = new OpenAIEmbeddingClient(
        createTestConfig({
          openaiApiKey: mockApiKey,
          embeddingMaxRetries: -1,
          embeddingRetryDelay: 10, // Short delay for testing
        }),
      );
      const result = await client.generateEmbedding(mockText);

      expect(result.success).toBe(false);
      expect(result.error).toContain(
        "Failed to generate embedding after 1 attempts",
      );
      expect(result.error).toContain("Invalid input");
    });

    it("should retry on failure and eventually succeed", async () => {
      const mockEmbedding = new Array(1536).fill(0.2);
      const mockSuccessResponse = {
        data: [{ embedding: mockEmbedding }],
      };

      const mockError = new Error("Server error");

      const { default: OpenAI } = await import("openai");
      const mockOpenAI = OpenAI as unknown as {
        mockImplementation: (impl: () => unknown) => void;
      };
      const mockCreate = vi
        .fn()
        .mockRejectedValueOnce(mockError)
        .mockRejectedValueOnce(mockError)
        .mockResolvedValueOnce(mockSuccessResponse);
      mockOpenAI.mockImplementation(() => ({
        embeddings: {
          create: mockCreate,
        },
      }));

      const client = new OpenAIEmbeddingClient(
        createTestConfig({
          openaiApiKey: mockApiKey,
          embeddingMaxRetries: 2,
          embeddingRetryDelay: 10, // Short delay for testing
        }),
      );
      const result = await client.generateEmbedding(mockText);

      expect(result.success).toBe(true);
      expect(result.embedding).toEqual(new Float32Array(mockEmbedding));
      expect(mockCreate).toHaveBeenCalledTimes(3);
    });

    it("should fail after max retries", async () => {
      const mockError = new Error("Server error");

      const { default: OpenAI } = await import("openai");
      const mockOpenAI = OpenAI as any;
      const mockCreate = vi.fn().mockRejectedValue(mockError);
      mockOpenAI.mockImplementation(() => ({
        embeddings: {
          create: mockCreate,
        },
      }));

      const client = new OpenAIEmbeddingClient(
        createTestConfig({
          openaiApiKey: mockApiKey,
          embeddingMaxRetries: 2,
          embeddingRetryDelay: 10, // Short delay for testing
        }),
      );
      const result = await client.generateEmbedding(mockText);

      expect(result.success).toBe(false);
      expect(result.error).toContain(
        "Failed to generate embedding after 3 attempts",
      );
      expect(mockCreate).toHaveBeenCalledTimes(3);
    });

    it("should handle invalid response format", async () => {
      const mockResponse = {
        data: [], // No embedding in response
      };

      const { default: OpenAI } = await import("openai");
      const mockOpenAI = OpenAI as any;
      const mockCreate = vi.fn().mockResolvedValue(mockResponse);
      mockOpenAI.mockImplementation(() => ({
        embeddings: {
          create: mockCreate,
        },
      }));

      const client = new OpenAIEmbeddingClient(
        createTestConfig({
          openaiApiKey: mockApiKey,
          embeddingMaxRetries: 0,
        }),
      );
      const result = await client.generateEmbedding(mockText);

      expect(result.success).toBe(false);
      expect(result.error).toBe(
        "Invalid embedding response format from OpenAI API",
      );
    });

    it("should use exponential backoff for retries", async () => {
      const mockError = new Error("Server error");

      const { default: OpenAI } = await import("openai");
      const mockOpenAI = OpenAI as any;
      const mockCreate = vi.fn().mockRejectedValue(mockError);
      mockOpenAI.mockImplementation(() => ({
        embeddings: {
          create: mockCreate,
        },
      }));

      const startTime = Date.now();
      const client = new OpenAIEmbeddingClient(
        createTestConfig({
          openaiApiKey: mockApiKey,
          embeddingMaxRetries: 2,
          embeddingRetryDelay: 100,
        }),
      );

      await client.generateEmbedding(mockText);
      const endTime = Date.now();
      const totalTime = endTime - startTime;

      // Should have delays of 100ms and 200ms (exponential backoff)
      // Allow some tolerance for test execution time
      expect(totalTime).toBeGreaterThan(250);
      expect(mockCreate).toHaveBeenCalledTimes(3);
    });
  });
});
