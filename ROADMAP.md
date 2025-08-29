# Langoustine MCP Server Roadmap

An intelligent MCP server that automatically learns and applies developer coding preferences to enhance LLM interactions in coding environments like Cursor, Claude Code, and other AI assistants.

## Project Vision

Create an MCP server that seamlessly integrates with coding agents to automatically track, learn, and apply developer preferences without requiring explicit instruction management from the developer.

## Core Features

### 1. Automatic Instruction Recognition & Storage

- **Smart Detection**: LLM automatically recognizes when developers give generalizable instructions
- **Examples of Generalizable Instructions**:
  - "Write unit tests"
  - "Don't mock internal code"
  - "Use pascal case"
  - "Always add error handling"
  - "Follow DRY principles"
- **Storage**: Each instruction is stored as a new row (instructions are applied only once)

### 2. Rule Generation & Management

- **Rule Abstraction**: Transform specific instructions into general, reusable rules
- **Rule Matching**: Intelligent matching of new instructions to existing rules
- **Instruction Counting**: Track how often developers manually correct the LLM with instructions that match existing rules
- **Vector Embeddings**: Store semantic embeddings for intelligent rule retrieval

### 3. Context-Aware Rule Retrieval

- **Context Analysis**: Tool that accepts context strings and finds relevant rules
- **Smart Ranking**: Rules ordered by:
  - Vector similarity to current context
  - Historical instruction count (how often developers had to manually correct)
  - Recency of use
- **Dynamic Application**: Automatically inject relevant rules into LLM context

## Technical Architecture

### Database Schema

```sql
-- Instructions table: stores verbatim developer instructions (each application = new row)
instructions (
  id INTEGER PRIMARY KEY,
  instruction TEXT NOT NULL,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
  context TEXT NOT NULL, -- coding context when instruction was given
  rule_id INTEGER, -- references the matching rule
  FOREIGN KEY (rule_id) REFERENCES rules(id)
)

-- Rules table: stores generalized rules derived from instructions
rules (
  id INTEGER PRIMARY KEY,
  rule_text TEXT NOT NULL,
  category TEXT, -- e.g., "testing", "naming", "architecture"
  context TEXT, -- specific situation, e.g., "Testing external API integrations", "Creating React controllers"
  relevance_score FLOAT DEFAULT 1.0,
  embedding BLOB, -- vector embedding
  created_from_instruction_id INTEGER,
  last_applied DATETIME,
  instructions_count INTEGER DEFAULT 0, -- how often developers had to manually correct
  FOREIGN KEY (created_from_instruction_id) REFERENCES instructions(id)
)

-- Rule applications: tracks when and how rules are applied
rule_applications (
  id INTEGER PRIMARY KEY,
  rule_id INTEGER,
  context_hash TEXT,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  effectiveness_score FLOAT -- feedback mechanism
)
```

### Rule Context Examples

```sql
-- Example rules with category + context
INSERT INTO rules (rule_text, category, context) VALUES
  ('Don''t mock external APIs in integration tests', 'testing', 'Testing external API integrations'),
  ('Use PascalCase for component names', 'naming', 'Creating React components'),
  ('Always add error handling for database operations', 'error-handling', 'Database operations'),
  ('Include JSDoc comments for public methods', 'documentation', 'Creating public API methods'),
  ('Use dependency injection for services', 'architecture', 'Creating service classes');
```

### MCP Tools

1. **`storeInstruction`**
   - Automatically called by LLM when recognizing generalizable instructions
   - Parameters:
     - instruction (string): The verbatim instruction provided by the developer.
     - context (string): The development context describing what the developer was working on when the instruction was given (e.g., "Testing external API integrations", "React components", "Public API methods").
   - Returns: instruction ID and any matching existing rules
   - Increments `instructions_count` on matching rule

2. **`getRelevantRules`**
   - Called to retrieve context-appropriate rules
   - Parameters: `context`, `max_rules`
   - Returns: ranked list of relevant rules with scores
   - Uses both category and context fields for matching

3. **`updateRuleRelevance`** (optional)
   - Feedback mechanism to improve rule ranking
   - Parameters: `rule_id`, `effectiveness_score`

## Implementation Phases

### Phase 1: Foundation (MVP)

- [x] Set up MCP server structure
- [x] Implement SQLite database with basic schema (including context field)
- [x] Create `storeInstruction` tool
- [ ] Allow passing in configuration when starting the server
  - Project directory
- [ ] Create `getRelevantRules` tool with basic text matching
- [x] Basic rule generation from instructions
- [ ] Instruction counting and rule matching logic
- [ ] Make executable with npx

### Phase 2: Intelligence Layer

- [ ] Integrate vector embedding system (e.g., sentence-transformers)
- [ ] Implement semantic similarity matching using both category and context
- [ ] Add relevance scoring algorithm
- [ ] Create rule categorization system
- [ ] Add duplicate detection for instructions/rules

### Phase 3: Learning & Optimization

- [ ] Implement feedback mechanism
- [ ] Add rule effectiveness tracking
- [ ] Create rule consolidation logic (merge similar rules)
- [ ] Add context-aware rule weighting
- [ ] Implement rule aging/deprecation

### Phase 4: Advanced Features

- [ ] Project-specific rule scoping
- [ ] Rule inheritance and hierarchies
- [ ] Integration with popular IDEs
- [ ] Rule export/import functionality
- [ ] Analytics dashboard for rule usage

### Phase 5: Ecosystem Integration

- [ ] Cursor IDE plugin/integration
- [ ] Claude Code native support
- [ ] VS Code extension
- [ ] Documentation and tutorials
- [ ] Community rule sharing platform

## Success Metrics

- **Adoption Rate**: Number of developers actively using the server
- **Rule Application**: Frequency of automatic rule application
- **Developer Satisfaction**: Feedback on rule relevance and usefulness
- **Learning Efficiency**: Time to build useful rule base for new developers
- **Context Accuracy**: Precision of context-relevant rule retrieval
- **Instruction Reduction**: Decrease in repeated manual corrections over time

## Technical Considerations

### Vector Embeddings

- Use lightweight embedding model (e.g., all-MiniLM-L6-v2)
- Store embeddings as binary blobs in SQLite
- Implement efficient similarity search
- Generate embeddings from combined category + context + rule_text for better matching

### Performance

- Cache frequently used rules
- Optimize vector similarity calculations
- Implement rule indexing for fast retrieval
- Index both category and context fields

### Privacy & Security

- All data stored locally
- No external API calls for rule processing
- Optional encrypted database support

## Future Enhancements

- **Multi-language Support**: Language-specific rule categories
- **Team Collaboration**: Shared rule bases for development teams
- **IDE Integration**: Deep integration with popular development environments
- **Rule Validation**: Automatic testing of rule effectiveness
- **Natural Language Processing**: Better instruction parsing and rule generation
- **Context Hierarchies**: Support for nested contexts (e.g., "Testing > API > External integrations")
