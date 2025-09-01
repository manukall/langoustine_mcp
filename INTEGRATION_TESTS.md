# Integration Tests

This document explains how to run integration tests that use the real OpenAI API.

## Overview

Integration tests verify that the application works correctly with the actual OpenAI API. These tests are **not run by default** because they:

- Make real API calls that cost money
- Require a valid OpenAI API key
- Take longer to run than unit tests
- May be affected by API rate limits

### 🛡️ Database Safety

Integration tests use a **separate test database** (`langoustine.integration-test.db`) that is:

- ✅ **Automatically created** when tests start
- ✅ **Completely isolated** from your development database
- ✅ **Automatically cleaned** between tests
- ✅ **Automatically deleted** after tests complete

**Your development data is completely safe!**

## Prerequisites

1. **OpenAI API Key**: You need a valid `LANGOUSTINE_MCP_OPENAI_API_KEY` environment variable
2. **API Credits**: Ensure you have sufficient credits in your OpenAI account
3. **Rate Limits**: Be aware of OpenAI's rate limits

## Running Integration Tests

### Option 1: Using npm scripts (Recommended)

```bash
# Run only integration tests
npm run test:integration

# Run all tests (unit + integration)
npm run test:all
```

### Option 2: Using environment variable directly

```bash
# Set the flag and run tests
RUN_INTEGRATION_TESTS=true npm test

# Or export the variable
export RUN_INTEGRATION_TESTS=true
npm test
```

### Option 3: Using vitest directly

```bash
# Run specific integration test files
RUN_INTEGRATION_TESTS=true npx vitest run src/llm/embedding-client.integration.test.ts
RUN_INTEGRATION_TESTS=true npx vitest run src/tools/rememberDeveloperInstruction.integration.test.ts
```

## What Integration Tests Cover

### Database Isolation

Integration tests use a **separate test database** to ensure:

- ✅ **No interference** with your development database
- ✅ **Clean slate** for each test run
- ✅ **Automatic cleanup** after tests complete
- ✅ **Safe testing** without affecting real data

### Test Database Lifecycle

1. **Setup**: Test database created at `./.langoustine/langoustine.integration-test.db`
2. **Before Each Test**: All tables cleared (DELETE FROM rules, DELETE FROM user_instructions)
3. **During Test**: Normal database operations on isolated test database
4. **After All Tests**: Test database file completely deleted from disk

### Embedding Client Tests (`src/llm/embedding-client.integration.test.ts`)

- ✅ Real embedding generation with OpenAI API
- ✅ Different text types (simple, complex, empty)
- ✅ Embedding similarity validation
- ✅ Rate limiting and retry behavior
- ✅ Error handling with real API responses

### End-to-End Tests (`src/tools/rememberDeveloperInstruction.integration.test.ts`)

- ✅ Complete instruction → rule → embedding flow
- ✅ Database storage and retrieval
- ✅ Multiple instructions processing
- ✅ Edge cases (short/long instructions)
- ✅ Data integrity and relationships
- ✅ Database cleanup between tests

## Cost Estimation

**Approximate costs per test run:**

- **Embedding API**: ~$0.0001 per 1K tokens
- **GPT API**: ~$0.002 per 1K tokens
- **Total per integration test run**: ~$0.01-0.05

**Costs are minimal but add up with frequent runs.**

## When to Run Integration Tests

### Recommended Scenarios

- ✅ **Before major releases**
- ✅ **After significant code changes**
- ✅ **Daily/weekly scheduled runs** (CI/CD)
- ✅ **When debugging API-related issues**
- ✅ **After updating OpenAI SDK or API usage**

### Not Recommended

- ❌ **During regular development**
- ❌ **In CI/CD for every commit**
- ❌ **When OpenAI API is experiencing issues**
- ❌ **If you're near your API usage limits**

## Troubleshooting

### Common Issues

1. **"LANGOUSTINE_MCP_OPENAI_API_KEY environment variable is required"**
   - Set your API key: `export LANGOUSTINE_MCP_OPENAI_API_KEY=your_key_here`

2. **"Failed to generate embedding"**
   - Check your API key is valid
   - Verify you have sufficient credits
   - Check OpenAI API status

3. **Rate limiting errors**
   - Wait a few minutes and retry
   - Reduce the number of concurrent tests
   - Check your OpenAI rate limits

4. **Timeout errors**
   - Increase timeout values in test files
   - Check your internet connection
   - Verify OpenAI API response times

### Environment Variables

```bash
# Required
export LANGOUSTINE_MCP_OPENAI_API_KEY=your_api_key_here

# Optional (for integration tests)
export RUN_INTEGRATION_TESTS=true
export LANGOUSTINE_DB_PATH=./.langoustine/langoustine.integration-test.db

# Optional (for debugging)
export OPENAI_EMBEDDING_MODEL=text-embedding-3-small
export EMBEDDING_MAX_RETRIES=2
export EMBEDDING_RETRY_DELAY=1000
```

## CI/CD Integration

For automated testing, you can add integration tests to your CI/CD pipeline:

```yaml
# Example GitHub Actions workflow
- name: Run Integration Tests
  if: github.event_name == 'push' && github.ref == 'refs/heads/main'
  env:
    LANGOUSTINE_MCP_OPENAI_API_KEY: ${{ secrets.LANGOUSTINE_MCP_OPENAI_API_KEY }}
    RUN_INTEGRATION_TESTS: true
  run: npm run test:integration
```

**Note**: Only run on main branch or release branches to minimize costs.
