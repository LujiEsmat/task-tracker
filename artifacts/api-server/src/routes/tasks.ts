import { Router, type IRouter } from "express";
import {
  CreateTaskBody,
  DeleteTaskParams,
  GetTaskSummaryResponse,
  ListTasksQueryParams,
  ListTasksResponse,
  UpdateTaskBody,
  UpdateTaskParams,
  UpdateTaskResponse,
} from "@workspace/api-zod";
import { rowToTask, sqlite, type TaskRow } from "../lib/sqlite";

const router: IRouter = Router();

router.get("/tasks", (req, res): void => {
  const parsedQuery = ListTasksQueryParams.safeParse(req.query);
  if (!parsedQuery.success) {
    req.log.warn({ errors: parsedQuery.error.message }, "Invalid task filter");
    res.status(400).json({ error: parsedQuery.error.message });
    return;
  }

  const rows =
    parsedQuery.data.completed === undefined
      ? sqlite
          .prepare("SELECT * FROM tasks ORDER BY completed ASC, createdAt DESC")
          .all()
      : sqlite
          .prepare(
            "SELECT * FROM tasks WHERE completed = ? ORDER BY createdAt DESC",
          )
          .all(parsedQuery.data.completed ? 1 : 0);

  res.json(ListTasksResponse.parse((rows as TaskRow[]).map(rowToTask)));
});

router.post("/tasks", (req, res): void => {
  const parsedBody = CreateTaskBody.safeParse(req.body);
  if (!parsedBody.success) {
    req.log.warn({ errors: parsedBody.error.message }, "Invalid task body");
    res.status(400).json({ error: parsedBody.error.message });
    return;
  }

  const now = new Date().toISOString();
  const result = sqlite
    .prepare(
      "INSERT INTO tasks (title, description, completed, createdAt, updatedAt) VALUES (?, ?, 0, ?, ?)",
    )
    .run(parsedBody.data.title.trim(), parsedBody.data.description ?? "", now, now);
  const row = sqlite
    .prepare("SELECT * FROM tasks WHERE id = ?")
    .get(result.lastInsertRowid) as TaskRow;

  res.status(201).json(rowToTask(row));
});

router.get("/tasks/summary", (req, res): void => {
  const row = sqlite
    .prepare(
      "SELECT COUNT(*) AS total, SUM(CASE WHEN completed = 0 THEN 1 ELSE 0 END) AS active, SUM(CASE WHEN completed = 1 THEN 1 ELSE 0 END) AS completed FROM tasks",
    )
    .get() as { total: number; active: number | null; completed: number | null };

  res.json(
    GetTaskSummaryResponse.parse({
      total: row.total,
      active: row.active ?? 0,
      completed: row.completed ?? 0,
    }),
  );
});

router.patch("/tasks/:id", (req, res): void => {
  const parsedParams = UpdateTaskParams.safeParse(req.params);
  if (!parsedParams.success) {
    res.status(400).json({ error: parsedParams.error.message });
    return;
  }

  const parsedBody = UpdateTaskBody.safeParse(req.body);
  if (!parsedBody.success) {
    req.log.warn({ errors: parsedBody.error.message }, "Invalid task update");
    res.status(400).json({ error: parsedBody.error.message });
    return;
  }

  const existing = sqlite
    .prepare("SELECT * FROM tasks WHERE id = ?")
    .get(parsedParams.data.id) as TaskRow | undefined;
  if (!existing) {
    res.status(404).json({ error: "Task not found" });
    return;
  }

  const title = parsedBody.data.title?.trim() ?? existing.title;
  const description = parsedBody.data.description ?? existing.description;
  const completed =
    parsedBody.data.completed === undefined
      ? existing.completed
      : parsedBody.data.completed
        ? 1
        : 0;
  const updatedAt = new Date().toISOString();

  sqlite
    .prepare(
      "UPDATE tasks SET title = ?, description = ?, completed = ?, updatedAt = ? WHERE id = ?",
    )
    .run(title, description, completed, updatedAt, parsedParams.data.id);

  const updated = sqlite
    .prepare("SELECT * FROM tasks WHERE id = ?")
    .get(parsedParams.data.id) as TaskRow;
  res.json(UpdateTaskResponse.parse(rowToTask(updated)));
});

router.delete("/tasks/:id", (req, res): void => {
  const parsedParams = DeleteTaskParams.safeParse(req.params);
  if (!parsedParams.success) {
    res.status(400).json({ error: parsedParams.error.message });
    return;
  }

  const result = sqlite
    .prepare("DELETE FROM tasks WHERE id = ?")
    .run(parsedParams.data.id);
  if (result.changes === 0) {
    res.status(404).json({ error: "Task not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;