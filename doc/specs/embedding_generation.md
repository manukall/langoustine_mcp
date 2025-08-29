# Embedding Generation for Rule Storage

## Overview

We need to use the OpenAI API to create an embedding when we store a new rule. This will enable semantic search and similarity matching for rules in the future.

## Current Context

### Existing Structure

- **Rule Storage**: Currently handled in `src/tools/rememberDeveloperInstruction.ts`
- **Database Schema**: Rules table already has `embedding FLOAT[1536]` column
- **LLM Client**: Existing `LLMClient` interface for rule generation
- **Database**: SQLite with sqlite-vec extension loaded

### Current Flow

1. User instruction received
2. LLM generates abstract rule from instruction + context
3. Check for existing matching rule
4. Store rule and instruction in database
5. No embedding generation currently

## Requirements

### Functional Requirements

- Generate embeddings for all new rules using OpenAI API
- No rules should exist without embeddings
- Use `text-embedding-3-small` model (configurable)
- Implement retry logic with eventual failure
- Maintain existing rule creation functionality

### Technical Requirements

- Extract rule creation to separate `RulesRepo` module
- Create new `EmbeddingClient` interface
- Use existing database embedding column
- Mock API calls in unit tests
- Test retry and failure scenarios

### Design Decisions

1. **Embedding Model**: `text-embedding-3-small` (configurable)
2. **Error Handling**: Retry with eventual failure, no rules without embeddings
3. **Database**: Use existing `embedding FLOAT[1536]` column
4. **Testing**: Fixed vector for mocks, test retry/failure scenarios
5. **Architecture**: Separate `EmbeddingClient` interface
6. **Repository Pattern**: Separate `InstructionsRepo` and `RulesRepo` modules
7. **Duplicate Handling**: No duplicate checking for now (always create new rules)

## Task List

### 1. Create EmbeddingClient Interface and Implementation

- [x] Create `src/llm/embedding-client.ts` with `EmbeddingClient` interface
- [x] Add `generateEmbedding(text: string): Promise<EmbeddingResult>` method
- [x] Create `OpenAIEmbeddingClient` implementation using `text-embedding-3-small`
- [x] Add configurable model parameter with default to `text-embedding-3-small`
- [x] Implement retry logic with configurable max retries and delay
- [x] Add proper error handling and logging
- [x] Use OpenAI SDK instead of fetch for API calls

### 2. Create Mock Embedding Client for Testing

- [x] Create `src/llm/mock-embedding-client.ts`
- [x] Implement `MockEmbeddingClient` with configurable responses
- [x] Add methods to simulate failures and retries
- [x] Use fixed embedding vector for successful responses
- [x] Add test utilities for different scenarios (success, failure, retry)

### 3. Extract Rules Repository Module

- [x] Create `src/repos/rules-repo.ts`
- [x] Move rule creation logic from `rememberDeveloperInstruction.ts`
- [x] Add `createRule(ruleText: string, category: string, context: string, createdFromInstructionId: number): Promise<Rule>`
- [x] Integrate embedding generation before rule insertion
- [x] Ensure atomic operation (embedding generation + rule insertion)
- [x] Add proper error handling and rollback if needed
- [x] Remove duplicate checking (always create new rules)

### 4. Create Instructions Repository Module

- [x] Create `src/repos/instructions-repo.ts`
- [x] Add `createInstruction(instruction: string, context: string): Promise<UserInstruction>`
- [x] Add methods for finding and updating instructions
- [x] Handle instruction-rule linking

### 5. Update LLM Module Exports

- [x] Update `src/llm/index.ts` to export new embedding interfaces
- [x] Add `EmbeddingClient`, `EmbeddingResult` types
- [x] Export both `OpenAIEmbeddingClient` and `MockEmbeddingClient`

### 6. Update RememberDeveloperInstruction Tool

- [x] Refactor `src/tools/rememberDeveloperInstruction.ts`
- [x] Remove direct database operations
- [x] Use both `InstructionsRepo` and `RulesRepo` for creation
- [x] Pass `EmbeddingClient` to the handler
- [x] Maintain existing functionality and error handling
- [x] Create instruction first, then rule, then link them

### 7. Update Database Initialization

- [x] Update `src/database.ts` to accept `EmbeddingClient` dependency
- [x] Ensure proper initialization order
- [x] Add any necessary database setup for embedding operations

### 8. Write Comprehensive Unit Tests

- [x] Test `OpenAIEmbeddingClient` with mocked API calls
- [x] Test retry logic and failure scenarios
- [x] Test `RulesRepo` with mocked dependencies
- [x] Test `InstructionsRepo` with mocked dependencies
- [x] Test `rememberDeveloperInstruction` with mocked components
- [x] Test error handling and edge cases
- [x] Ensure no live API calls in tests

### 9. Update Configuration and Dependencies

- [x] Add embedding model configuration to environment variables
- [x] Update any configuration interfaces
- [x] Add retry configuration parameters
- [x] Update dependency injection where needed

### 10. Integration and End-to-End Testing

- [x] Test complete flow from instruction to stored rule with embedding
- [x] Verify database schema compatibility
- [x] Test with real OpenAI API (integration test). Make sure those tests are not run with the default test script, since they cost money.
- [x] Verify error handling in production scenarios

### 11. Documentation and Cleanup

- [x] Update any relevant documentation
- [x] Add JSDoc comments for new interfaces
- [x] Ensure consistent error messages
- [x] Verify all imports and exports are correct

## Implementation Status

### ✅ Completed Tasks (1-11)

All functionality has been implemented and tested:

- ✅ Embedding generation with OpenAI API
- ✅ Repository pattern for rules and instructions
- ✅ Comprehensive unit tests (55/55 passing)
- ✅ Configuration via environment variables
- ✅ JSDoc documentation for all interfaces
- ✅ Consistent error handling
- ✅ Integration tests with real OpenAI API (cost-controlled)

### 🎉 Project Status: COMPLETE

The embedding generation feature is fully implemented with:

- **Unit Tests**: 55/55 passing (no API costs)
- **Integration Tests**: Available on-demand (minimal API costs, isolated test database)
- **Documentation**: Complete with usage instructions
- **Production Ready**: All error handling and edge cases covered
- **Database Safety**: Integration tests use separate test database with automatic cleanup

## Implementation Notes

### EmbeddingClient Interface

```typescript
export interface EmbeddingClient {
  generateEmbedding(text: string): Promise<EmbeddingResult>;
}

export interface EmbeddingResult {
  success: boolean;
  embedding?: number[];
  error?: string;
}
```

### Repository Pattern

```typescript
// InstructionsRepo
export interface InstructionsRepo {
  createInstruction(params: CreateInstructionParams): Promise<UserInstruction>;
  findInstructionById(id: number): UserInstruction | null;
  findInstructionsByRuleId(ruleId: number): UserInstruction[];
}

// RulesRepo
export interface RulesRepo {
  createRule(params: CreateRuleParams): Promise<Rule>;
  findRuleById(id: number): Rule | null;
}
```

### Configuration

- Environment variable for embedding model: `OPENAI_EMBEDDING_MODEL`
- Default model: `text-embedding-3-small`
- Retry configuration: `EMBEDDING_MAX_RETRIES`, `EMBEDDING_RETRY_DELAY`

### Error Handling Strategy

1. Attempt embedding generation with retries
2. If embedding fails after all retries, fail the entire operation
3. No partial rule creation without embeddings
4. Log all failures for debugging

### Testing Strategy

- Mock OpenAI API calls in unit tests
- Use fixed 1536-dimensional vector for successful responses
- Test retry scenarios with configurable failure patterns
- Test complete integration with mocked dependencies
