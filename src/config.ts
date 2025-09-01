/**
 * Configuration module for Langoustine MCP Server
 * Centralizes management of command line arguments and environment variables
 */

import { parseArgs } from "util";

/**
 * Helper function to parse integer arguments safely
 */
function parseIntegerArg(
  value: string | undefined,
  fieldName: string,
): number | undefined {
  if (!value) return undefined;

  const parsed = parseInt(value, 10);
  if (isNaN(parsed)) {
    throw new Error(`Invalid ${fieldName}: "${value}" is not a valid number`);
  }
  return parsed;
}

export interface Config {
  /** Database file path */
  databasePath: string;
  /** Whether help was requested */
  showHelp: boolean;
  /** OpenAI API key */
  openaiApiKey?: string;
  /** LLM model to use */
  llmModel: string;
  /** Maximum retry attempts for LLM */
  llmMaxRetries: number;
  /** Retry delay for LLM in milliseconds */
  llmRetryDelay: number;
  /** Embedding model to use */
  embeddingModel: string;
  /** Maximum retry attempts for embeddings */
  embeddingMaxRetries: number;
  /** Retry delay for embeddings in milliseconds */
  embeddingRetryDelay: number;
}

/**
 * Parse command line arguments using Node.js parseArgs
 */
function parseCommandLineArgs(args: string[]): Partial<Config> {
  const { values } = parseArgs({
    args,
    options: {
      help: {
        type: "boolean",
        short: "h",
      },
      db: {
        type: "string",
      },
      database: {
        type: "string",
      },
      "openai-api-key": {
        type: "string",
      },
      "llm-model": {
        type: "string",
      },
      "llm-max-retries": {
        type: "string",
      },
      "llm-retry-delay": {
        type: "string",
      },
      "embedding-model": {
        type: "string",
      },
      "embedding-max-retries": {
        type: "string",
      },
      "embedding-retry-delay": {
        type: "string",
      },
    },
    allowPositionals: false,
  });

  const config: Partial<Config> = {};

  if (values.help) {
    config.showHelp = true;
  }

  if (values.db) {
    config.databasePath = values.db;
  }

  if (values.database) {
    config.databasePath = values.database;
  }

  if (values["openai-api-key"]) {
    config.openaiApiKey = values["openai-api-key"];
  }

  if (values["llm-model"]) {
    config.llmModel = values["llm-model"];
  }

  const llmMaxRetries = parseIntegerArg(
    values["llm-max-retries"],
    "LLM max retries",
  );
  if (llmMaxRetries !== undefined) {
    config.llmMaxRetries = llmMaxRetries;
  }

  const llmRetryDelay = parseIntegerArg(
    values["llm-retry-delay"],
    "LLM retry delay",
  );
  if (llmRetryDelay !== undefined) {
    config.llmRetryDelay = llmRetryDelay;
  }

  if (values["embedding-model"]) {
    config.embeddingModel = values["embedding-model"];
  }

  const embeddingMaxRetries = parseIntegerArg(
    values["embedding-max-retries"],
    "embedding max retries",
  );
  if (embeddingMaxRetries !== undefined) {
    config.embeddingMaxRetries = embeddingMaxRetries;
  }

  const embeddingRetryDelay = parseIntegerArg(
    values["embedding-retry-delay"],
    "embedding retry delay",
  );
  if (embeddingRetryDelay !== undefined) {
    config.embeddingRetryDelay = embeddingRetryDelay;
  }

  return config;
}

/**
 * Parse environment variables
 */
function parseEnvironmentVariables(): Partial<Config> {
  const config: Partial<Config> = {};

  if (process.env.LANGOUSTINE_DB_PATH) {
    config.databasePath = process.env.LANGOUSTINE_DB_PATH;
  }

  if (process.env.LANGOUSTINE_MCP_OPENAI_API_KEY) {
    config.openaiApiKey = process.env.LANGOUSTINE_MCP_OPENAI_API_KEY;
  }

  if (process.env.LLM_MODEL) {
    config.llmModel = process.env.LLM_MODEL;
  }

  const llmMaxRetries = parseIntegerArg(
    process.env.LLM_MAX_RETRIES,
    "LLM_MAX_RETRIES environment variable",
  );
  if (llmMaxRetries !== undefined) {
    config.llmMaxRetries = llmMaxRetries;
  }

  const llmRetryDelay = parseIntegerArg(
    process.env.LLM_RETRY_DELAY,
    "LLM_RETRY_DELAY environment variable",
  );
  if (llmRetryDelay !== undefined) {
    config.llmRetryDelay = llmRetryDelay;
  }

  if (process.env.OPENAI_EMBEDDING_MODEL) {
    config.embeddingModel = process.env.OPENAI_EMBEDDING_MODEL;
  }

  const embeddingMaxRetries = parseIntegerArg(
    process.env.EMBEDDING_MAX_RETRIES,
    "EMBEDDING_MAX_RETRIES environment variable",
  );
  if (embeddingMaxRetries !== undefined) {
    config.embeddingMaxRetries = embeddingMaxRetries;
  }

  const embeddingRetryDelay = parseIntegerArg(
    process.env.EMBEDDING_RETRY_DELAY,
    "EMBEDDING_RETRY_DELAY environment variable",
  );
  if (embeddingRetryDelay !== undefined) {
    config.embeddingRetryDelay = embeddingRetryDelay;
  }

  return config;
}

/**
 * Get default configuration values
 */
function getDefaults(): Config {
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
 * Create configuration object from command line arguments and environment variables
 * Priority order: CLI args > environment variables > defaults
 */
export function createConfig(argv: string[] = process.argv): Config {
  const args = argv.slice(2); // Remove 'node' and script name

  try {
    const defaults = getDefaults();
    const envConfig = parseEnvironmentVariables();
    const cliConfig = parseCommandLineArgs(args);

    // Merge configurations with proper priority
    return {
      ...defaults,
      ...envConfig,
      ...cliConfig,
    };
  } catch (error) {
    // Show helpful error message and help output, then exit
    console.error(
      `\nError: ${error instanceof Error ? error.message : "Invalid configuration"}`,
    );
    console.error("\nFor valid options, see:");
    displayHelp();
    process.exit(1);
  }
}

/**
 * Display help information
 */
export function displayHelp(): void {
  console.log(`
Langoustine MCP Server

Usage: npx langoustine-mcp [options]

Options:
  --db, --database <path>          Specify the database file path
                                  (default: ./.langoustine/langoustine.db)
  --openai-api-key <key>          OpenAI API key
  --llm-model <model>             LLM model to use  
                                  (default: gpt-5-mini-2025-08-07)
  --llm-max-retries <number>      Maximum retry attempts for LLM (default: 3)
  --llm-retry-delay <ms>          Retry delay for LLM in milliseconds (default: 1000)
  --embedding-model <model>       Embedding model to use
                                  (default: text-embedding-3-small)
  --embedding-max-retries <number> Maximum retry attempts for embeddings (default: 3)
  --embedding-retry-delay <ms>    Retry delay for embeddings in milliseconds (default: 1000)
  --help, -h                      Show this help message

Environment Variables:
  LANGOUSTINE_DB_PATH             Database file path (overridden by --db argument)
  LANGOUSTINE_MCP_OPENAI_API_KEY                  OpenAI API key (overridden by --openai-api-key)
  LLM_MODEL                       LLM model (overridden by --llm-model)
  LLM_MAX_RETRIES                 LLM max retries (overridden by --llm-max-retries)
  LLM_RETRY_DELAY                 LLM retry delay (overridden by --llm-retry-delay)
  OPENAI_EMBEDDING_MODEL          Embedding model (overridden by --embedding-model)
  EMBEDDING_MAX_RETRIES           Embedding max retries (overridden by --embedding-max-retries)
  EMBEDDING_RETRY_DELAY           Embedding retry delay (overridden by --embedding-retry-delay)

Examples:
  npx langoustine-mcp --db /path/to/my/database.db
  npx langoustine-mcp --openai-api-key sk-xxx --llm-model gpt-4
  npx langoustine-mcp --embedding-model text-embedding-ada-002 --embedding-max-retries 5
`);
}
