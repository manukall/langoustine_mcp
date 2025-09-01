#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { initializeDatabase } from "./database.js";
import {
  rememberDeveloperInstructionSchema,
  rememberDeveloperInstructionHandler,
} from "./tools/rememberDeveloperInstruction.js";
import {
  getRelevantRulesSchema,
  getRelevantRulesHandler,
} from "./tools/getRelevantRules.js";
import { OpenAIClient } from "./llm/openai-client.js";
import { OpenAIEmbeddingClient } from "./llm/embedding-client.js";
import { createConfig, displayHelp } from "./config.js";

// Initialize configuration
const config = createConfig();

// Handle help request
if (config.showHelp) {
  displayHelp();
  process.exit(0);
}

// Create an MCP server
const server = new McpServer({
  name: "Langoustine",
  version: "1.0.0",
});

// Initialize database with config
const db = initializeDatabase(config);

// Initialize LLM client with config
const llmClient = new OpenAIClient(config);

// Initialize embedding client with config
const embeddingClient = new OpenAIEmbeddingClient(config);

// Add tools
server.registerTool(
  "rememberDeveloperInstruction",
  rememberDeveloperInstructionSchema,
  async (params) => {
    const result = await rememberDeveloperInstructionHandler(
      params as { instruction: string; context: string },
      db,
      llmClient,
      embeddingClient,
    );
    console.error(result);
    return result;
  },
);

server.registerTool(
  "getRelevantRules",
  getRelevantRulesSchema,
  async (params) => {
    const result = await getRelevantRulesHandler(
      params as {
        taskDescription: string;
        maxResults?: number;
        similarityThreshold?: number;
      },
      db,
      embeddingClient,
    );
    console.error(result);
    return result;
  },
);

// Start receiving messages on stdin and sending messages on stdout
const transport = new StdioServerTransport();
await server.connect(transport);
