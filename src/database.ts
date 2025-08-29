import path from "path";
import Database from "better-sqlite3";
import fs from "fs";
import * as sqliteVec from "sqlite-vec";
import type { Config } from "./config.js";

function createTables(db: Database.Database): void {
  const createInstructionsTableSQL = `
    CREATE TABLE IF NOT EXISTS user_instructions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      instruction TEXT NOT NULL,
      context TEXT NOT NULL,
      inserted_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      rule_id INTEGER REFERENCES rules(id) ON DELETE SET NULL
    )
  `;

  const createRulesTableSQL = `
    CREATE TABLE IF NOT EXISTS rules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      rule_text TEXT NOT NULL,
      category TEXT NOT NULL,
      context TEXT NOT NULL,
      relevance_score FLOAT DEFAULT 1.0,
      embedding FLOAT[1536],
      created_from_instruction_id INTEGER NOT NULL REFERENCES user_instructions(id) ON DELETE SET NULL,
      last_applied DATETIME,
      instructions_count INTEGER DEFAULT 0,
      inserted_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `;

  // Create instructions table first
  db.exec(createInstructionsTableSQL);
  console.error("user_instructions table ready");

  // Then create rules table
  db.exec(createRulesTableSQL);
  console.error("rules table ready");
}

export function initializeDatabase(config: Config): Database.Database {
  const dbPath = config.databasePath;
  // Create the database directory if it doesn't exist
  const dbDir = path.dirname(dbPath);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  const db = new Database(dbPath);
  console.error("Connected to SQLite database");

  sqliteVec.load(db);
  console.error("Loaded sqlite-vec");

  createTables(db);
  console.error("Created tables");

  return db;
}
