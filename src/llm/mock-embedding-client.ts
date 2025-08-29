import { EmbeddingClient, EmbeddingResult } from "./embedding-client.js";

export interface MockEmbeddingConfig {
  shouldFail?: boolean;
  failureAttempts?: number;
  delayMs?: number;
  customEmbedding?: Float32Array;
}

export class MockEmbeddingClient implements EmbeddingClient {
  private shouldFail: boolean;
  private failureAttempts: number;
  private delayMs: number;
  private customEmbedding: Float32Array;
  private callCount: number = 0;

  // Default 1536-dimensional embedding vector (all zeros for testing)
  private static readonly DEFAULT_EMBEDDING = new Float32Array(1536).fill(0);

  constructor(config: MockEmbeddingConfig = {}) {
    this.shouldFail = config.shouldFail || false;
    this.failureAttempts = config.failureAttempts || 0;
    this.delayMs = config.delayMs || 0;
    this.customEmbedding =
      config.customEmbedding || MockEmbeddingClient.DEFAULT_EMBEDDING;
  }

  async generateEmbedding(_text: string): Promise<EmbeddingResult> {
    this.callCount++;

    // Simulate delay if configured
    if (this.delayMs > 0) {
      await this.sleep(this.delayMs);
    }

    // Simulate failure scenarios
    if (this.shouldFail) {
      return {
        success: false,
        error: "Mock embedding generation failed",
      };
    }

    // Simulate failures for specific attempt numbers
    if (this.failureAttempts > 0 && this.callCount <= this.failureAttempts) {
      return {
        success: false,
        error: `Mock embedding generation failed on attempt ${this.callCount}`,
      };
    }

    // Return successful embedding
    return {
      success: true,
      embedding: new Float32Array(this.customEmbedding), // Return a copy to prevent mutation
    };
  }

  // Test utility methods
  getCallCount(): number {
    return this.callCount;
  }

  resetCallCount(): void {
    this.callCount = 0;
  }

  setShouldFail(shouldFail: boolean): void {
    this.shouldFail = shouldFail;
  }

  setFailureAttempts(attempts: number): void {
    this.failureAttempts = attempts;
  }

  setDelayMs(delayMs: number): void {
    this.delayMs = delayMs;
  }

  setCustomEmbedding(embedding: Float32Array): void {
    this.customEmbedding = new Float32Array(embedding);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// Factory functions for common test scenarios
export function createSuccessfulMockEmbeddingClient(
  embedding?: Float32Array,
): MockEmbeddingClient {
  return new MockEmbeddingClient({
    shouldFail: false,
    customEmbedding: embedding,
  });
}

export function createFailingMockEmbeddingClient(
  _errorMessage?: string,
): MockEmbeddingClient {
  return new MockEmbeddingClient({
    shouldFail: true,
  });
}

export function createRetryMockEmbeddingClient(
  failureAttempts: number,
  embedding?: Float32Array,
): MockEmbeddingClient {
  return new MockEmbeddingClient({
    shouldFail: false,
    failureAttempts,
    customEmbedding: embedding,
  });
}
