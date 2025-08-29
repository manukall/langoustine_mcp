import OpenAI from "openai";
import type { Config } from "../config.js";

/**
 * Interface for embedding generation clients.
 * Provides a standardized way to generate embeddings from text.
 */
export interface EmbeddingClient {
  /**
   * Generates an embedding vector for the given text.
   * @param text - The text to generate an embedding for
   * @returns Promise that resolves to an EmbeddingResult
   */
  generateEmbedding(text: string): Promise<EmbeddingResult>;
}

/**
 * Result of an embedding generation operation.
 */
export interface EmbeddingResult {
  /** Whether the embedding generation was successful */
  success: boolean;
  /** The generated embedding vector (Float32Array) if successful */
  embedding?: Float32Array;
  /** Error message if the operation failed */
  error?: string;
}

/**
 * Configuration options for embedding clients.
 */
export interface EmbeddingConfig {
  /** OpenAI API key (defaults to OPENAI_API_KEY environment variable) */
  apiKey?: string;
  /** Embedding model to use (defaults to OPENAI_EMBEDDING_MODEL or "text-embedding-3-small") */
  model?: string;
  /** Maximum number of retry attempts (defaults to EMBEDDING_MAX_RETRIES or 3) */
  maxRetries?: number;
  /** Base delay between retries in milliseconds (defaults to EMBEDDING_RETRY_DELAY or 1000). Exponential backoff is used. */
  retryDelay?: number;
}

/**
 * OpenAI implementation of the EmbeddingClient interface.
 * Generates embeddings using OpenAI's embedding API with retry logic and exponential backoff.
 */
export class OpenAIEmbeddingClient implements EmbeddingClient {
  private openai: OpenAI;
  private model: string;
  private maxRetries: number;
  private retryDelay: number;

  /**
   * Creates a new OpenAIEmbeddingClient instance.
   * @param config - Configuration object (assumed to be complete and valid)
   */
  constructor(config: Config) {
    this.openai = new OpenAI({
      apiKey: config.openaiApiKey!,
    });

    this.model = config.embeddingModel;
    this.maxRetries = config.embeddingMaxRetries;
    this.retryDelay = config.embeddingRetryDelay;
  }

  /**
   * Generates an embedding for the given text using OpenAI's API.
   * Implements retry logic with exponential backoff for failed requests.
   * @param text - The text to generate an embedding for
   * @returns Promise that resolves to an EmbeddingResult
   */
  async generateEmbedding(text: string): Promise<EmbeddingResult> {
    let lastError: string | undefined;

    // Ensure maxRetries is at least 0
    const effectiveMaxRetries = Math.max(0, this.maxRetries);

    for (let attempt = 0; attempt <= effectiveMaxRetries; attempt++) {
      try {
        const response = await this.openai.embeddings.create({
          model: this.model,
          input: text,
        });

        const embedding = response.data[0]?.embedding;

        if (!embedding) {
          return {
            success: false,
            error: "Invalid embedding response format from OpenAI API",
          };
        }

        return {
          success: true,
          embedding: new Float32Array(embedding),
        };
      } catch (error) {
        const errorMessage = this.extractErrorMessage(error);

        if (attempt === effectiveMaxRetries) {
          return {
            success: false,
            error: `Failed to generate embedding after ${effectiveMaxRetries + 1} attempts. Last error: ${errorMessage}`,
          };
        }

        lastError = errorMessage;
        console.warn(
          `Embedding generation attempt ${attempt + 1} failed: ${errorMessage}`,
        );

        if (attempt < effectiveMaxRetries) {
          await this.sleep(this.retryDelay * Math.pow(2, attempt)); // Exponential backoff
        }
      }
    }

    return {
      success: false,
      error: `Failed to generate embedding after ${effectiveMaxRetries + 1} attempts. Last error: ${lastError || "Unknown error"}`,
    };
  }

  /**
   * Extracts a meaningful error message from various error types.
   * @param error - The error object to extract a message from
   * @returns A string representation of the error
   */
  private extractErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }

    // Handle OpenAI API errors
    if (typeof error === "object" && error !== null) {
      const errorObj = error as {
        error?: { message?: string };
        message?: string;
      };
      if (errorObj.error?.message) {
        return errorObj.error.message;
      }
      if (errorObj.message) {
        return errorObj.message;
      }
    }

    return "Unknown error";
  }

  /**
   * Utility method to pause execution for a specified number of milliseconds.
   * @param ms - Number of milliseconds to sleep
   * @returns Promise that resolves after the specified delay
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
