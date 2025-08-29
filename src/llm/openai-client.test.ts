import { describe, it, expect, beforeEach, vi } from "vitest";
import { OpenAIClient } from "./openai-client.js";
import { createTestConfig } from "../test-utils.js";

// Mock OpenAI
const mockCreate = vi.fn();
vi.mock("openai", () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      chat: {
        completions: {
          create: mockCreate,
        },
      },
    })),
  };
});

describe("OpenAIClient", () => {
  let client: OpenAIClient;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.OPENAI_API_KEY = "test-api-key";
    client = new OpenAIClient(
      createTestConfig({ openaiApiKey: "test-api-key" }),
    );
  });

  describe("generateRule", () => {
    it("should successfully generate a rule", async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content:
                '{\n  "rule_text": "Don\'t mock internal modules",\n  "category": "testing"\n}',
            },
          },
        ],
      };

      mockCreate.mockResolvedValue(mockResponse);

      const result = await client.generateRule(
        "You have mocked the CalculateSumService, which is an internal module. Don't do that.",
        "Testing external API integrations",
      );

      expect(result.success).toBe(true);
      expect(result.rule).toEqual({
        rule_text: "Don't mock internal modules",
        category: "testing",
      });
      expect(mockCreate).toHaveBeenCalledWith({
        model: "gpt-5-mini-2025-08-07",
        messages: [
          {
            role: "system",
            content:
              "You are a coding assistant that extracts abstract rules from developer instructions.",
          },
          {
            role: "user",
            content: expect.stringContaining(
              "Task: Convert the following user instruction",
            ),
          },
        ],
      });
    });

    it("should handle invalid JSON response", async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: "Invalid JSON response",
            },
          },
        ],
      };

      mockCreate.mockResolvedValue(mockResponse);

      const result = await client.generateRule(
        "test instruction",
        "test context",
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("Failed to parse LLM response");
    });

    it("should handle missing rule_text or category", async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: '{\n  "rule_text": "test rule"\n}',
            },
          },
        ],
      };

      mockCreate.mockResolvedValue(mockResponse);

      const result = await client.generateRule(
        "test instruction",
        "test context",
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain(
        "Invalid response format: missing rule_text or category",
      );
    });
  });

  describe("prompt building", () => {
    it("should include instruction and context in prompt", async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: '{\n  "rule_text": "test",\n  "category": "testing"\n}',
            },
          },
        ],
      };

      mockCreate.mockResolvedValue(mockResponse);

      await client.generateRule("test instruction", "test context");

      const call = mockCreate.mock.calls[0][0];
      expect(call.messages[1].content).toContain("test instruction");
      expect(call.messages[1].content).toContain("test context");
    });
  });
});
