# Task Tracker

A responsive task tracker for creating, completing, viewing, and deleting tasks with local SQLite persistence.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server
- `pnpm --filter @workspace/task-tracker run dev` — run the web interface
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `DATABASE_PATH` — optional path to the local SQLite file; defaults to `database.sqlite`

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: SQLite via better-sqlite3
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- API contract: `lib/api-spec/openapi.yaml`
- Task API: `artifacts/api-server/src/routes/tasks.ts`
- SQLite setup and startup table creation: `artifacts/api-server/src/lib/sqlite.ts`
- Web interface: `artifacts/task-tracker/src/`

## Architecture decisions

- The app uses a local SQLite file as requested instead of the workspace's default PostgreSQL helper.
- The API creates the `tasks` table on startup with `CREATE TABLE IF NOT EXISTS`, so a fresh environment can run without a migration step.
- OpenAPI remains the source of truth for the task API and generates both server validation schemas and frontend React Query hooks.

## Product

Users can add tasks with descriptions, see active and completed work, toggle completion, filter the list, and delete tasks. A summary endpoint powers the overview counts.

## User preferences

The user requested a Node.js + Express app backed by a local `database.sqlite` file and an environment configuration file.

## Gotchas

The actual `.env` file is kept out of source edits; copy `artifacts/api-server/.env.example` to `.env` or set `DATABASE_PATH` in the environment when changing the SQLite location.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
