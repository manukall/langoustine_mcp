# Langoustine MCP Server

> **⚠️ Work in Progress:**  
> Langoustine MCP Server is under active development. Features, APIs, and behaviors may change.

An intelligent Model Context Protocol (MCP) server that automatically learns and applies developer coding preferences to enhance LLM interactions in coding environments like Cursor, Claude Code, and other AI assistants.

## What is Langoustine?

Langoustine is an MCP server that seamlessly integrates with coding agents to automatically track, learn, and apply developer preferences without requiring explicit instruction management. It helps AI assistants remember your coding style, patterns, and preferences across sessions.

### Key Benefits

🧠 **Automatic Learning**: Recognizes when you give generalizable instructions and stores them for future use  
🎯 **Context-Aware**: Retrieves relevant coding rules based on your current development task  
🔄 **Continuous Improvement**: Tracks how often you need to repeat instructions and prioritizes frequently needed rules  
📊 **Vector-Based Matching**: Uses semantic similarity to find the most relevant guidelines for your current context  
🗄️ **Persistent Memory**: Stores your preferences in a local SQLite database that persists across sessions

## Features

### Core Capabilities

- **Smart Instruction Recognition**: Automatically detects generalizable developer instructions
- **Rule Generation**: Transforms specific instructions into reusable, abstract rules
- **Context-Aware Retrieval**: Finds relevant rules based on semantic similarity to current tasks
- **Usage Tracking**: Monitors how often rules are applied to improve relevance scoring
- **Vector Embeddings**: Uses OpenAI embeddings for intelligent rule matching

### MCP Tools

Langoustine provides two main tools for AI assistants:

1. **`rememberDeveloperInstruction`**: Stores new developer instructions and generates corresponding rules
2. **`getRelevantRules`**: Retrieves relevant coding rules based on the current development context

### Example Use Cases

- "Always use TypeScript for new files" → Applied when creating new files
- "Don't mock internal modules" → Applied when writing unit tests
- "Use PascalCase for components" → Applied when working on React components
- "Add error handling to API calls" → Applied when implementing API integrations
- "Follow DRY principles" → Applied across all development contexts

## Installation

### Prerequisites

- **Node.js**: Version 16 or higher
- **OpenAI API Key**: Required for rule generation and embeddings

### Setup

1. **Clone the repository**:

   ```bash
   git clone <repository-url>
   cd langoustine-mcp
   ```

2. **Install dependencies**:

   ```bash
   npm install
   ```

3. **Build the project**:

   ```bash
   npm run build
   ```

4. **Set up your OpenAI API key**:
   ```bash
   export OPENAI_API_KEY=your-api-key-here
   ```

## Usage

### Basic Usage

Start the MCP server:

```bash
# Using npm scripts (recommended)
npm start
```

### Configuration Options

#### Command Line Arguments

```bash
# Specify custom database path
node build/index.js --db /path/to/custom/database.db

# Use different OpenAI models
node build/index.js --llm-model gpt-4 --embedding-model text-embedding-ada-002

# Adjust retry settings
node build/index.js --llm-max-retries 5 --embedding-max-retries 3
```

#### Environment Variables

```bash
# Database location
export LANGOUSTINE_DB_PATH="/path/to/database.db"

# OpenAI configuration
export OPENAI_API_KEY="your-api-key"
export LLM_MODEL="gpt-4"
export OPENAI_EMBEDDING_MODEL="text-embedding-3-small"

# Retry configuration
export LLM_MAX_RETRIES=3
export EMBEDDING_MAX_RETRIES=3
```

#### Available Options

| Option                    | Environment Variable     | Default                         | Description                      |
| ------------------------- | ------------------------ | ------------------------------- | -------------------------------- |
| `--db, --database`        | `LANGOUSTINE_DB_PATH`    | `./.langoustine/langoustine.db` | Database file path               |
| `--openai-api-key`        | `OPENAI_API_KEY`         | -                               | OpenAI API key (required)        |
| `--llm-model`             | `LLM_MODEL`              | `gpt-5-mini-2025-08-07`         | LLM model for rule generation    |
| `--embedding-model`       | `OPENAI_EMBEDDING_MODEL` | `text-embedding-3-small`        | Embedding model for similarity   |
| `--llm-max-retries`       | `LLM_MAX_RETRIES`        | `3`                             | Maximum LLM retry attempts       |
| `--embedding-max-retries` | `EMBEDDING_MAX_RETRIES`  | `3`                             | Maximum embedding retry attempts |

### Integration with Cursor

To use Langoustine with Cursor, you'll need to configure it as an MCP server in your Cursor settings. The server communicates via stdio and provides the tools mentioned above to enhance your coding experience.
It also helps to create a Cursor rule that instructs the assistant to use the Langoustine MCP server.

### Help

Display help information:

```bash
node build/index.js --help
```

## Development

### Development Setup

```bash
# Install dependencies
npm install

# Run in development mode (builds and starts)
npm run dev

# Or run with tsx for faster development
npm run tsx
```

### Testing

```bash
# Run unit tests
npm test

# Run integration tests (requires OPENAI_API_KEY)
npm run test:integration

# Run all tests
npm run test:all
```

### Code Quality

```bash
# Lint code
npm run lint

# Format code
npm run format

# Check formatting
npm run format:check
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

## License

[MIT](LICENSE)
