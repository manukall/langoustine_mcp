import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  vi,
  MockInstance,
} from "vitest";
import { createConfig, displayHelp } from "./config.js";
import { createTestConfig } from "./test-utils.js";

describe("Config module", () => {
  let originalEnv: NodeJS.ProcessEnv;
  let mockExit: MockInstance<typeof process.exit>;

  beforeEach(() => {
    // Save original environment
    originalEnv = { ...process.env };
    // Mock process.exit to prevent test runner from actually exiting
    mockExit = vi.spyOn(process, "exit").mockImplementation(() => {
      throw new Error("process.exit called");
    });
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
    mockExit.mockRestore();
  });

  describe("createConfig", () => {
    it("should return default values when no args or env vars", () => {
      // reset all env vars
      process.env = {};
      const config = createConfig([]);
      expect(config).toEqual({
        databasePath: "./.langoustine/langoustine.db",
        showHelp: false,
        llmModel: "gpt-5-mini-2025-08-07",
        llmMaxRetries: 3,
        llmRetryDelay: 1000,
        embeddingModel: "text-embedding-3-small",
        embeddingMaxRetries: 3,
        embeddingRetryDelay: 1000,
      });
    });

    it("should parse database path from --db argument", () => {
      const config = createConfig([
        "node",
        "script.js",
        "--db",
        "/custom/path.db",
      ]);
      expect(config.databasePath).toBe("/custom/path.db");
      expect(config.showHelp).toBe(false);
    });

    it("should parse database path from --database argument", () => {
      const config = createConfig([
        "node",
        "script.js",
        "--database",
        "/custom/path.db",
      ]);
      expect(config.databasePath).toBe("/custom/path.db");
    });

    it("should parse help flag from --help", () => {
      const config = createConfig(["node", "script.js", "--help"]);
      expect(config.showHelp).toBe(true);
    });

    it("should parse help flag from -h", () => {
      const config = createConfig(["node", "script.js", "-h"]);
      expect(config.showHelp).toBe(true);
    });

    it("should parse LLM configuration from CLI arguments", () => {
      const config = createConfig([
        "node",
        "script.js",
        "--openai-api-key",
        "test-key",
        "--llm-model",
        "gpt-4",
        "--llm-max-retries",
        "5",
        "--llm-retry-delay",
        "2000",
        "--embedding-model",
        "text-embedding-ada-002",
        "--embedding-max-retries",
        "10",
        "--embedding-retry-delay",
        "500",
      ]);
      expect(config.openaiApiKey).toBe("test-key");
      expect(config.llmModel).toBe("gpt-4");
      expect(config.llmMaxRetries).toBe(5);
      expect(config.llmRetryDelay).toBe(2000);
      expect(config.embeddingModel).toBe("text-embedding-ada-002");
      expect(config.embeddingMaxRetries).toBe(10);
      expect(config.embeddingRetryDelay).toBe(500);
    });

    it("should use environment variable when no CLI arg", () => {
      process.env.LANGOUSTINE_DB_PATH = "/env/path.db";
      const config = createConfig(["node", "script.js"]);
      expect(config.databasePath).toBe("/env/path.db");
    });

    it("should prioritize CLI arg over environment variable", () => {
      process.env.LANGOUSTINE_DB_PATH = "/env/path.db";
      const config = createConfig([
        "node",
        "script.js",
        "--db",
        "/cli/path.db",
      ]);
      expect(config.databasePath).toBe("/cli/path.db");
    });

    it("should handle multiple arguments correctly", () => {
      const config = createConfig([
        "node",
        "script.js",
        "--db",
        "/test/path.db",
        "--llm-model",
        "gpt-4",
        "--llm-max-retries",
        "5",
      ]);
      expect(config.databasePath).toBe("/test/path.db");
      expect(config.llmModel).toBe("gpt-4");
      expect(config.llmMaxRetries).toBe(5);
    });

    it("should handle invalid integer arguments with proper error", () => {
      expect(() => {
        createConfig(["node", "script.js", "--llm-max-retries", "invalid"]);
      }).toThrow("process.exit called");
      expect(mockExit).toHaveBeenCalledWith(1);
    });

    it("should use process.argv by default", () => {
      // Save original argv
      const originalArgv = process.argv;
      try {
        process.argv = ["node", "script.js", "--db", "/test.db"];
        const config = createConfig();
        expect(config.databasePath).toBe("/test.db");
      } finally {
        process.argv = originalArgv;
      }
    });
  });

  describe("displayHelp", () => {
    it("should display help without throwing", () => {
      expect(() => displayHelp()).not.toThrow();
    });
  });
});

describe("Test utilities", () => {
  describe("createTestConfig", () => {
    it("should return default values when no partial config provided", () => {
      const config = createTestConfig();
      expect(config).toEqual({
        databasePath: "./.langoustine/langoustine.db",
        showHelp: false,
        llmModel: "gpt-5-mini-2025-08-07",
        llmMaxRetries: 3,
        llmRetryDelay: 1000,
        embeddingModel: "text-embedding-3-small",
        embeddingMaxRetries: 3,
        embeddingRetryDelay: 1000,
      });
    });

    it("should override only specified fields", () => {
      const config = createTestConfig({
        databasePath: "/custom/test.db",
        llmModel: "gpt-4",
      });
      expect(config.databasePath).toBe("/custom/test.db");
      expect(config.llmModel).toBe("gpt-4");
      expect(config.showHelp).toBe(false); // Should use default
      expect(config.llmMaxRetries).toBe(3); // Should use default
    });

    it("should handle multiple field overrides", () => {
      const config = createTestConfig({
        databasePath: ":memory:",
        showHelp: true,
        llmMaxRetries: 10,
        embeddingRetryDelay: 500,
      });
      expect(config.databasePath).toBe(":memory:");
      expect(config.showHelp).toBe(true);
      expect(config.llmMaxRetries).toBe(10);
      expect(config.embeddingRetryDelay).toBe(500);
      // Check that non-overridden fields use defaults
      expect(config.llmModel).toBe("gpt-5-mini-2025-08-07");
      expect(config.embeddingModel).toBe("text-embedding-3-small");
    });

    it("should handle empty partial config", () => {
      const config = createTestConfig({});
      expect(config).toEqual({
        databasePath: "./.langoustine/langoustine.db",
        showHelp: false,
        llmModel: "gpt-5-mini-2025-08-07",
        llmMaxRetries: 3,
        llmRetryDelay: 1000,
        embeddingModel: "text-embedding-3-small",
        embeddingMaxRetries: 3,
        embeddingRetryDelay: 1000,
      });
    });
  });
});
