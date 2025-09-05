import { describe, it, expect, beforeEach, vi } from "vitest";
import { OpenAIClient } from "./openai-client.js";
import { createTestConfig } from "../test-utils.js";

// Mock OpenAI SDK
const mockParse = vi.fn();
vi.mock("openai/index", () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      chat: {
        completions: {
          parse: mockParse,
        },
      },
    })),
  };
});

describe("OpenAIClient", () => {
  let client: OpenAIClient;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.LANGOUSTINE_MCP_OPENAI_API_KEY = "test-api-key";
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
              parsed: {
                rule: {
                  rule_text: "Don't mock internal modules",
                  category: "testing",
                },
                reason: null,
              },
            },
          },
        ],
      };

      mockParse.mockResolvedValue(mockResponse);

      const result = await client.generateRule(
        "You have mocked the CalculateSumService, which is an internal module. Don't do that.",
        "Testing external API integrations",
      );

      expect(result.success).toBe(true);
      expect(result.rule).toEqual({
        rule_text: "Don't mock internal modules",
        category: "testing",
      });

      const call = mockParse.mock.calls[0][0];
      expect(call).toMatchObject({
        model: "gpt-5-mini-2025-08-07",
      });
      expect(call.messages[0]).toMatchObject({ role: "system" });
      expect(call.messages[1]).toMatchObject({ role: "user" });
      expect(call.response_format).toBeDefined();
    });

    it("should return reason when rule is null", async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              parsed: {
                rule: null,
                reason: "Too specific: pixel tweak",
              },
            },
          },
        ],
      };

      mockParse.mockResolvedValue(mockResponse);

      const result = await client.generateRule(
        "Move the button 3 px right",
        "UI fine-tuning",
      );

      expect(result.success).toBe(true);
      expect(result.rule).toBeNull();
      expect(result.reason).toBe("Too specific: pixel tweak");
    });
  });

  describe("prompt building", () => {
    it("should include instruction and context in prompt", async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              parsed: {
                rule: {
                  rule_text: "test",
                  category: "testing",
                },
                reason: null,
              },
            },
          },
        ],
      };

      mockParse.mockResolvedValue(mockResponse);

      await client.generateRule("test instruction", "test context");

      const call = mockParse.mock.calls[0][0];
      expect(call.messages[1].content).toContain("test instruction");
      expect(call.messages[1].content).toContain("test context");
      expect(call.messages[1].content).toContain(
        "Determine if the instruction is generalizable",
      );
      expect(call.response_format).toBeDefined();
    });
  });
});
