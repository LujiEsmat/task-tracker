import Database from "better-sqlite3";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export type TaskRow = {
  id: number;
  title: string;
  description: string;
  completed: number;
  createdAt: string;
  updatedAt: string;
};

const packageDir = path.resolve(fileURLToPath(new URL("../..", import.meta.url)));
const databasePath = path.resolve(
  packageDir,
  process.env.DATABASE_PATH ?? "database.sqlite",
);
const isNewDatabase = !existsSync(databasePath);

export const sqlite = new Database(databasePath);

sqlite.pragma("journal_mode = WAL");
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    completed INTEGER NOT NULL DEFAULT 0 CHECK (completed IN (0, 1)),
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL
  )
`);

if (isNewDatabase) {
  const seed = sqlite.prepare(
    "INSERT INTO tasks (title, description, completed, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?)",
  );
  const now = new Date().toISOString();
  const seedMany = sqlite.transaction(() => {
    seed.run(
      "Plan my top three priorities",
      "A short list keeps the day focused.",
      0,
      now,
      now,
    );
    seed.run(
      "Review the task tracker",
      "Check off this example task when you are ready.",
      0,
      now,
      now,
    );
  });
  seedMany();
}

export function rowToTask(row: TaskRow) {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    completed: row.completed === 1,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function closeDatabase() {
  sqlite.close();
}