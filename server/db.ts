import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import type {
  ActivityAction,
  ActivityEntry,
  AppSettings,
  BootstrapPayload,
  Category,
  DateFormatOption,
  Priority,
  Subtask,
  Task,
  TaskDraft,
  TaskStatus,
  ThemeMode,
  WeekStartDay,
} from '../src/types.ts';

const VALID_PRIORITIES: ReadonlySet<string> = new Set(['low', 'medium', 'high', 'urgent']);
const VALID_STATUSES: ReadonlySet<string> = new Set(['pending', 'completed']);
const VALID_THEMES: ReadonlySet<string> = new Set(['light', 'dark']);
const VALID_WEEK_STARTS: ReadonlySet<string> = new Set(['sunday', 'monday']);
const VALID_DATE_FORMATS: ReadonlySet<string> = new Set([
  'MMM D, YYYY',
  'MM/DD/YYYY',
  'DD/MM/YYYY',
  'YYYY-MM-DD',
]);

const DEFAULT_CATEGORIES: Array<{ id: string; name: string; color: string }> = [
  { id: 'cat-personal', name: 'Personal', color: '#2563EB' },
  { id: 'cat-college', name: 'College', color: '#0891B2' },
  { id: 'cat-assignments', name: 'Assignments', color: '#D97706' },
  { id: 'cat-projects', name: 'Projects', color: '#7C3AED' },
  { id: 'cat-work', name: 'Work', color: '#059669' },
  { id: 'cat-shopping', name: 'Shopping', color: '#DB2777' },
  { id: 'cat-other', name: 'Other', color: '#64748B' },
];

const DEFAULT_SETTINGS: AppSettings = {
  theme: 'light',
  profileName: 'Workspace User',
  defaultPriority: 'medium',
  weekStartsOn: 'monday',
  dateFormat: 'MMM D, YYYY',
  notificationsEnabled: false,
  dueDateAlerts: true,
  overdueAlerts: true,
};

function resolveDbPath(): string {
  if (process.env.TASKFLOW_DB_PATH) {
    return path.resolve(process.env.TASKFLOW_DB_PATH);
  }
  return path.resolve(process.cwd(), 'data', 'taskflow.db');
}

const dbPath = resolveDbPath();
fs.mkdirSync(path.dirname(dbPath), { recursive: true });

const db = new DatabaseSync(dbPath);
db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA foreign_keys = ON;');

db.exec(`
  CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    color TEXT NOT NULL,
    is_default INTEGER NOT NULL DEFAULT 0,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    notes TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'pending',
    important INTEGER NOT NULL DEFAULT 0,
    priority TEXT NOT NULL DEFAULT 'medium',
    start_date TEXT,
    due_date TEXT,
    due_time TEXT,
    reminder_at TEXT,
    reminder_notified INTEGER NOT NULL DEFAULT 0,
    category_id TEXT REFERENCES categories(id) ON DELETE SET NULL,
    tags_json TEXT NOT NULL DEFAULT '[]',
    completed_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS subtasks (
    id TEXT PRIMARY KEY,
    task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    completed INTEGER NOT NULL DEFAULT 0,
    sort_order INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS activity_log (
    id TEXT PRIMARY KEY,
    task_id TEXT,
    task_title TEXT NOT NULL,
    action TEXT NOT NULL,
    timestamp TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS meta (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
`);

const taskCols = db.prepare('PRAGMA table_info(tasks)').all() as Array<{ name: string }>;
if (!taskCols.some((c) => c.name === 'due_time')) {
  db.exec('ALTER TABLE tasks ADD COLUMN due_time TEXT;');
}

function initializeDefaults(): void {
  const seeded = db.prepare('SELECT value FROM meta WHERE key = ?').get('defaults_seeded') as
    | { value: string }
    | undefined;

  if (!seeded) {
    const now = new Date().toISOString();
    const insertCat = db.prepare(
      'INSERT OR IGNORE INTO categories (id, name, color, is_default, sort_order, created_at) VALUES (?, ?, ?, 1, ?, ?)'
    );
    DEFAULT_CATEGORIES.forEach((cat, idx) => {
      insertCat.run(cat.id, cat.name, cat.color, idx, now);
    });

    const insertSetting = db.prepare(
      'INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)'
    );
    for (const [k, v] of Object.entries(DEFAULT_SETTINGS)) {
      insertSetting.run(k, JSON.stringify(v));
    }

    db.prepare('INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)').run(
      'defaults_seeded',
      'true'
    );
  }
}

initializeDefaults();

function withTransaction<T>(fn: () => T): T {
  db.exec('BEGIN');
  try {
    const result = fn();
    db.exec('COMMIT');
    return result;
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
}

function logActivity(taskId: string | null, taskTitle: string, action: ActivityAction): void {
  db.prepare(
    'INSERT INTO activity_log (id, task_id, task_title, action, timestamp) VALUES (?, ?, ?, ?, ?)'
  ).run(crypto.randomUUID(), taskId, taskTitle, action, new Date().toISOString());
}

function parseTags(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed
        .filter((item): item is string => typeof item === 'string')
        .map((s) => s.trim())
        .filter(Boolean);
    }
    return [];
  } catch {
    return [];
  }
}

function normalizeDateOrNull(val: unknown): string | null {
  if (typeof val !== 'string' || !val.trim()) return null;
  const trimmed = val.trim().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return null;
  return trimmed;
}

function normalizeTimeOrNull(val: unknown): string | null {
  if (typeof val !== 'string' || !val.trim()) return null;
  const trimmed = val.trim().slice(0, 5);
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(trimmed)) return null;
  return trimmed;
}

function normalizeDateTimeOrNull(val: unknown): string | null {
  if (typeof val !== 'string' || !val.trim()) return null;
  const trimmed = val.trim();
  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) return null;
  return trimmed;
}

function mapCategory(row: Record<string, unknown>): Category {
  return {
    id: String(row.id),
    name: String(row.name),
    color: String(row.color),
    isDefault: Number(row.is_default) === 1,
    sortOrder: Number(row.sort_order),
    createdAt: String(row.created_at),
  };
}

function mapSubtask(row: Record<string, unknown>): Subtask {
  return {
    id: String(row.id),
    taskId: String(row.task_id),
    title: String(row.title),
    completed: Number(row.completed) === 1,
    sortOrder: Number(row.sort_order),
  };
}

function mapTask(row: Record<string, unknown>, subtasksByTask: Map<string, Subtask[]>): Task {
  const id = String(row.id);
  return {
    id,
    title: String(row.title),
    description: String(row.description ?? ''),
    notes: String(row.notes ?? ''),
    status: VALID_STATUSES.has(String(row.status)) ? (String(row.status) as TaskStatus) : 'pending',
    important: Number(row.important) === 1,
    priority: VALID_PRIORITIES.has(String(row.priority))
      ? (String(row.priority) as Priority)
      : 'medium',
    startDate: row.start_date ? String(row.start_date) : null,
    dueDate: row.due_date ? String(row.due_date) : null,
    dueTime: row.due_time ? String(row.due_time) : null,
    reminderAt: row.reminder_at ? String(row.reminder_at) : null,
    reminderNotified: Number(row.reminder_notified) === 1,
    categoryId: row.category_id ? String(row.category_id) : null,
    tags: parseTags(String(row.tags_json ?? '[]')),
    subtasks: subtasksByTask.get(id) ?? [],
    completedAt: row.completed_at ? String(row.completed_at) : null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

export function getCategories(): Category[] {
  const rows = db
    .prepare('SELECT * FROM categories ORDER BY sort_order ASC, created_at ASC')
    .all() as Array<Record<string, unknown>>;
  return rows.map(mapCategory);
}

export function getSettings(): AppSettings {
  const rows = db.prepare('SELECT key, value FROM settings').all() as Array<{
    key: string;
    value: string;
  }>;
  const merged: AppSettings = { ...DEFAULT_SETTINGS };
  for (const row of rows) {
    try {
      const val = JSON.parse(row.value);
      if (row.key === 'theme' && VALID_THEMES.has(val)) merged.theme = val as ThemeMode;
      if (row.key === 'profileName' && typeof val === 'string') merged.profileName = val;
      if (row.key === 'defaultPriority' && VALID_PRIORITIES.has(val)) {
        merged.defaultPriority = val as Priority;
      }
      if (row.key === 'weekStartsOn' && VALID_WEEK_STARTS.has(val)) {
        merged.weekStartsOn = val as WeekStartDay;
      }
      if (row.key === 'dateFormat' && VALID_DATE_FORMATS.has(val)) {
        merged.dateFormat = val as DateFormatOption;
      }
      if (row.key === 'notificationsEnabled' && typeof val === 'boolean') {
        merged.notificationsEnabled = val;
      }
      if (row.key === 'dueDateAlerts' && typeof val === 'boolean') {
        merged.dueDateAlerts = val;
      }
      if (row.key === 'overdueAlerts' && typeof val === 'boolean') {
        merged.overdueAlerts = val;
      }
    } catch {
      // Ignore malformed setting entry
    }
  }
  return merged;
}

export function getAllTasks(): Task[] {
  const subtaskRows = db
    .prepare('SELECT * FROM subtasks ORDER BY sort_order ASC')
    .all() as Array<Record<string, unknown>>;
  const subtasksByTask = new Map<string, Subtask[]>();
  for (const row of subtaskRows) {
    const sub = mapSubtask(row);
    const list = subtasksByTask.get(sub.taskId) ?? [];
    list.push(sub);
    subtasksByTask.set(sub.taskId, list);
  }

  const taskRows = db
    .prepare('SELECT * FROM tasks ORDER BY created_at DESC')
    .all() as Array<Record<string, unknown>>;
  return taskRows.map((row) => mapTask(row, subtasksByTask));
}

export function getTaskById(id: string): Task | null {
  const row = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id) as
    | Record<string, unknown>
    | undefined;
  if (!row) return null;
  const subtaskRows = db
    .prepare('SELECT * FROM subtasks WHERE task_id = ? ORDER BY sort_order ASC')
    .all(id) as Array<Record<string, unknown>>;
  const map = new Map<string, Subtask[]>();
  map.set(id, subtaskRows.map(mapSubtask));
  return mapTask(row, map);
}

export function getActivityLog(limit = 200): ActivityEntry[] {
  const rows = db
    .prepare('SELECT * FROM activity_log ORDER BY timestamp DESC LIMIT ?')
    .all(limit) as Array<Record<string, unknown>>;
  return rows.map((row) => ({
    id: String(row.id),
    taskId: row.task_id ? String(row.task_id) : null,
    taskTitle: String(row.task_title),
    action: String(row.action) as ActivityAction,
    timestamp: String(row.timestamp),
  }));
}

export function getBootstrapData(): BootstrapPayload {
  return {
    tasks: getAllTasks(),
    categories: getCategories(),
    settings: getSettings(),
    activityLog: getActivityLog(250),
  };
}

export function createTask(input: Partial<TaskDraft>): Task {
  const title = typeof input.title === 'string' ? input.title.trim() : '';
  if (!title) {
    throw new Error('Task title is required.');
  }
  if (title.length > 240) {
    throw new Error('Task title cannot exceed 240 characters.');
  }

  const priority: Priority =
    input.priority && VALID_PRIORITIES.has(input.priority) ? input.priority : 'medium';
  const description = typeof input.description === 'string' ? input.description.trim() : '';
  const notes = typeof input.notes === 'string' ? input.notes.trim() : '';
  const important = Boolean(input.important);
  const startDate = normalizeDateOrNull(input.startDate);
  const dueDate = normalizeDateOrNull(input.dueDate);
  const dueTime = dueDate ? normalizeTimeOrNull(input.dueTime) : null;
  const reminderAt = normalizeDateTimeOrNull(input.reminderAt);

  if (startDate && dueDate && dueDate < startDate) {
    throw new Error('Due date cannot be earlier than start date.');
  }

  let categoryId: string | null = null;
  if (typeof input.categoryId === 'string' && input.categoryId.trim()) {
    const cat = db.prepare('SELECT id FROM categories WHERE id = ?').get(input.categoryId.trim());
    if (cat) categoryId = input.categoryId.trim();
  }

  const tags = Array.isArray(input.tags)
    ? Array.from(
        new Set(
          input.tags
            .filter((t): t is string => typeof t === 'string')
            .map((t) => t.trim())
            .filter(Boolean)
        )
      ).slice(0, 20)
    : [];

  const subtasks = Array.isArray(input.subtasks)
    ? input.subtasks
        .filter((s) => s && typeof s.title === 'string' && s.title.trim())
        .map((s) => ({
          id: s.id && typeof s.id === 'string' ? s.id : crypto.randomUUID(),
          title: s.title.trim().slice(0, 200),
          completed: Boolean(s.completed),
        }))
    : [];

  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  withTransaction(() => {
    db.prepare(
      `INSERT INTO tasks (
        id, title, description, notes, status, important, priority,
        start_date, due_date, due_time, reminder_at, reminder_notified, category_id,
        tags_json, completed_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, 'pending', ?, ?, ?, ?, ?, ?, 0, ?, ?, NULL, ?, ?)`
    ).run(
      id,
      title,
      description,
      notes,
      important ? 1 : 0,
      priority,
      startDate,
      dueDate,
      dueTime,
      reminderAt,
      categoryId,
      JSON.stringify(tags),
      now,
      now
    );

    const insertSub = db.prepare(
      'INSERT INTO subtasks (id, task_id, title, completed, sort_order) VALUES (?, ?, ?, ?, ?)'
    );
    subtasks.forEach((sub, idx) => {
      insertSub.run(sub.id, id, sub.title, sub.completed ? 1 : 0, idx);
    });

    logActivity(id, title, 'created');
  });

  const created = getTaskById(id);
  if (!created) throw new Error('Failed to load newly created task.');
  return created;
}

export function updateTask(
  id: string,
  patch: Partial<TaskDraft> & { status?: TaskStatus; reminderNotified?: boolean }
): Task {
  const existing = getTaskById(id);
  if (!existing) {
    throw new Error('Task not found.');
  }

  const title =
    patch.title !== undefined
      ? typeof patch.title === 'string'
        ? patch.title.trim()
        : ''
      : existing.title;
  if (!title) {
    throw new Error('Task title cannot be empty.');
  }
  if (title.length > 240) {
    throw new Error('Task title cannot exceed 240 characters.');
  }

  const description =
    patch.description !== undefined && typeof patch.description === 'string'
      ? patch.description.trim()
      : existing.description;
  const notes =
    patch.notes !== undefined && typeof patch.notes === 'string'
      ? patch.notes.trim()
      : existing.notes;
  const priority: Priority =
    patch.priority !== undefined && VALID_PRIORITIES.has(patch.priority)
      ? patch.priority
      : existing.priority;
  const important = patch.important !== undefined ? Boolean(patch.important) : existing.important;
  const status: TaskStatus =
    patch.status !== undefined && VALID_STATUSES.has(patch.status) ? patch.status : existing.status;

  const startDate =
    patch.startDate !== undefined ? normalizeDateOrNull(patch.startDate) : existing.startDate;
  const dueDate =
    patch.dueDate !== undefined ? normalizeDateOrNull(patch.dueDate) : existing.dueDate;
  const dueTime =
    dueDate === null
      ? null
      : patch.dueTime !== undefined
      ? normalizeTimeOrNull(patch.dueTime)
      : existing.dueTime;

  if (startDate && dueDate && dueDate < startDate) {
    throw new Error('Due date cannot be earlier than start date.');
  }

  const reminderAt =
    patch.reminderAt !== undefined ? normalizeDateTimeOrNull(patch.reminderAt) : existing.reminderAt;

  let reminderNotified = existing.reminderNotified;
  if (patch.reminderNotified !== undefined) {
    reminderNotified = Boolean(patch.reminderNotified);
  } else if (patch.reminderAt !== undefined && patch.reminderAt !== existing.reminderAt) {
    reminderNotified = false;
  }

  let categoryId = existing.categoryId;
  if (patch.categoryId !== undefined) {
    if (patch.categoryId === null || patch.categoryId === '') {
      categoryId = null;
    } else if (typeof patch.categoryId === 'string') {
      const cat = db.prepare('SELECT id FROM categories WHERE id = ?').get(patch.categoryId);
      categoryId = cat ? patch.categoryId : null;
    }
  }

  const tags =
    patch.tags !== undefined && Array.isArray(patch.tags)
      ? Array.from(
          new Set(
            patch.tags
              .filter((t): t is string => typeof t === 'string')
              .map((t) => t.trim())
              .filter(Boolean)
          )
        ).slice(0, 20)
      : existing.tags;

  const now = new Date().toISOString();
  let completedAt = existing.completedAt;
  if (status === 'completed' && existing.status !== 'completed') {
    completedAt = now;
  } else if (status === 'pending' && existing.status === 'completed') {
    completedAt = null;
  }

  withTransaction(() => {
    db.prepare(
      `UPDATE tasks SET
        title = ?,
        description = ?,
        notes = ?,
        status = ?,
        important = ?,
        priority = ?,
        start_date = ?,
        due_date = ?,
        due_time = ?,
        reminder_at = ?,
        reminder_notified = ?,
        category_id = ?,
        tags_json = ?,
        completed_at = ?,
        updated_at = ?
      WHERE id = ?`
    ).run(
      title,
      description,
      notes,
      status,
      important ? 1 : 0,
      priority,
      startDate,
      dueDate,
      dueTime,
      reminderAt,
      reminderNotified ? 1 : 0,
      categoryId,
      JSON.stringify(tags),
      completedAt,
      now,
      id
    );

    if (patch.subtasks !== undefined && Array.isArray(patch.subtasks)) {
      db.prepare('DELETE FROM subtasks WHERE task_id = ?').run(id);
      const insertSub = db.prepare(
        'INSERT INTO subtasks (id, task_id, title, completed, sort_order) VALUES (?, ?, ?, ?, ?)'
      );
      patch.subtasks
        .filter((s) => s && typeof s.title === 'string' && s.title.trim())
        .forEach((s, idx) => {
          insertSub.run(
            s.id && typeof s.id === 'string' ? s.id : crypto.randomUUID(),
            id,
            s.title.trim().slice(0, 200),
            s.completed ? 1 : 0,
            idx
          );
        });
    }

    if (status === 'completed' && existing.status !== 'completed') {
      logActivity(id, title, 'completed');
    } else if (status === 'pending' && existing.status === 'completed') {
      logActivity(id, title, 'reopened');
    }
  });

  const updated = getTaskById(id);
  if (!updated) throw new Error('Task not found after update.');
  return updated;
}

export function deleteTask(id: string): void {
  const existing = getTaskById(id);
  if (!existing) {
    throw new Error('Task not found.');
  }
  withTransaction(() => {
    db.prepare('DELETE FROM tasks WHERE id = ?').run(id);
    logActivity(null, existing.title, 'deleted');
  });
}

export function deleteCompletedTasks(): number {
  const completedRows = db
    .prepare("SELECT id, title FROM tasks WHERE status = 'completed'")
    .all() as Array<{ id: string; title: string }>;
  if (completedRows.length === 0) return 0;

  withTransaction(() => {
    db.prepare("DELETE FROM tasks WHERE status = 'completed'").run();
    for (const row of completedRows) {
      logActivity(null, row.title, 'deleted');
    }
  });
  return completedRows.length;
}

export function addSubtask(taskId: string, title: string): Subtask {
  const existing = getTaskById(taskId);
  if (!existing) throw new Error('Task not found.');
  const trimmed = title.trim();
  if (!trimmed) throw new Error('Subtask title is required.');

  const subId = crypto.randomUUID();
  const sortOrder = existing.subtasks.length;
  db.prepare(
    'INSERT INTO subtasks (id, task_id, title, completed, sort_order) VALUES (?, ?, ?, 0, ?)'
  ).run(subId, taskId, trimmed.slice(0, 200), sortOrder);
  db.prepare('UPDATE tasks SET updated_at = ? WHERE id = ?').run(new Date().toISOString(), taskId);

  return {
    id: subId,
    taskId,
    title: trimmed.slice(0, 200),
    completed: false,
    sortOrder,
  };
}

export function updateSubtask(
  subtaskId: string,
  patch: { title?: string; completed?: boolean }
): Subtask {
  const row = db.prepare('SELECT * FROM subtasks WHERE id = ?').get(subtaskId) as
    | Record<string, unknown>
    | undefined;
  if (!row) throw new Error('Subtask not found.');

  const nextTitle =
    patch.title !== undefined
      ? patch.title.trim().slice(0, 200) || String(row.title)
      : String(row.title);
  const nextCompleted =
    patch.completed !== undefined ? (patch.completed ? 1 : 0) : Number(row.completed);

  db.prepare('UPDATE subtasks SET title = ?, completed = ? WHERE id = ?').run(
    nextTitle,
    nextCompleted,
    subtaskId
  );
  db.prepare('UPDATE tasks SET updated_at = ? WHERE id = ?').run(
    new Date().toISOString(),
    String(row.task_id)
  );

  return {
    id: subtaskId,
    taskId: String(row.task_id),
    title: nextTitle,
    completed: nextCompleted === 1,
    sortOrder: Number(row.sort_order),
  };
}

export function deleteSubtask(subtaskId: string): void {
  const row = db.prepare('SELECT task_id FROM subtasks WHERE id = ?').get(subtaskId) as
    | { task_id: string }
    | undefined;
  if (!row) throw new Error('Subtask not found.');
  db.prepare('DELETE FROM subtasks WHERE id = ?').run(subtaskId);
  db.prepare('UPDATE tasks SET updated_at = ? WHERE id = ?').run(
    new Date().toISOString(),
    row.task_id
  );
}

export function createCategory(name: string, color: string): Category {
  const trimmed = name.trim();
  if (!trimmed) throw new Error('Category name is required.');
  if (trimmed.length > 48) throw new Error('Category name cannot exceed 48 characters.');

  const existing = db
    .prepare('SELECT id FROM categories WHERE LOWER(name) = LOWER(?)')
    .get(trimmed);
  if (existing) throw new Error('A category with this name already exists.');

  const validColor = /^#[0-9A-Fa-f]{6}$/.test(color) ? color : '#2563EB';
  const maxOrderRow = db.prepare('SELECT MAX(sort_order) as maxOrder FROM categories').get() as {
    maxOrder: number | null;
  };
  const sortOrder = (maxOrderRow?.maxOrder ?? -1) + 1;
  const id = `cat-${crypto.randomUUID().slice(0, 8)}`;
  const now = new Date().toISOString();

  db.prepare(
    'INSERT INTO categories (id, name, color, is_default, sort_order, created_at) VALUES (?, ?, ?, 0, ?, ?)'
  ).run(id, trimmed, validColor, sortOrder, now);

  return {
    id,
    name: trimmed,
    color: validColor,
    isDefault: false,
    sortOrder,
    createdAt: now,
  };
}

export function updateCategory(
  id: string,
  patch: { name?: string; color?: string }
): Category {
  const row = db.prepare('SELECT * FROM categories WHERE id = ?').get(id) as
    | Record<string, unknown>
    | undefined;
  if (!row) throw new Error('Category not found.');

  const nextName =
    patch.name !== undefined ? patch.name.trim().slice(0, 48) : String(row.name);
  if (!nextName) throw new Error('Category name cannot be empty.');

  const duplicate = db
    .prepare('SELECT id FROM categories WHERE LOWER(name) = LOWER(?) AND id != ?')
    .get(nextName, id);
  if (duplicate) throw new Error('Another category already has this name.');

  const nextColor =
    patch.color && /^#[0-9A-Fa-f]{6}$/.test(patch.color) ? patch.color : String(row.color);

  db.prepare('UPDATE categories SET name = ?, color = ? WHERE id = ?').run(nextName, nextColor, id);

  return {
    ...mapCategory(row),
    name: nextName,
    color: nextColor,
  };
}

export function deleteCategory(id: string): void {
  const row = db.prepare('SELECT id FROM categories WHERE id = ?').get(id);
  if (!row) throw new Error('Category not found.');
  withTransaction(() => {
    db.prepare('UPDATE tasks SET category_id = NULL WHERE category_id = ?').run(id);
    db.prepare('DELETE FROM categories WHERE id = ?').run(id);
  });
}

function saveSettingsValues(patch: Partial<AppSettings>): AppSettings {
  const current = getSettings();
  const next: AppSettings = {
    theme: patch.theme && VALID_THEMES.has(patch.theme) ? patch.theme : current.theme,
    profileName:
      typeof patch.profileName === 'string' && patch.profileName.trim()
        ? patch.profileName.trim().slice(0, 60)
        : current.profileName,
    defaultPriority:
      patch.defaultPriority && VALID_PRIORITIES.has(patch.defaultPriority)
        ? patch.defaultPriority
        : current.defaultPriority,
    weekStartsOn:
      patch.weekStartsOn && VALID_WEEK_STARTS.has(patch.weekStartsOn)
        ? patch.weekStartsOn
        : current.weekStartsOn,
    dateFormat:
      patch.dateFormat && VALID_DATE_FORMATS.has(patch.dateFormat)
        ? patch.dateFormat
        : current.dateFormat,
    notificationsEnabled:
      typeof patch.notificationsEnabled === 'boolean'
        ? patch.notificationsEnabled
        : current.notificationsEnabled,
    dueDateAlerts:
      typeof patch.dueDateAlerts === 'boolean' ? patch.dueDateAlerts : current.dueDateAlerts,
    overdueAlerts:
      typeof patch.overdueAlerts === 'boolean' ? patch.overdueAlerts : current.overdueAlerts,
  };

  const stmt = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
  for (const [k, v] of Object.entries(next)) {
    stmt.run(k, JSON.stringify(v));
  }
  return next;
}

export function updateSettings(patch: Partial<AppSettings>): AppSettings {
  return withTransaction(() => saveSettingsValues(patch));
}

export function exportAllData() {
  return {
    app: 'TaskFlow',
    version: 1,
    exportedAt: new Date().toISOString(),
    ...getBootstrapData(),
  };
}

export function importAllData(payload: unknown): BootstrapPayload {
  if (!payload || typeof payload !== 'object') {
    throw new Error('Invalid backup file format.');
  }
  const data = payload as Partial<BootstrapPayload>;
  if (!Array.isArray(data.tasks) || !Array.isArray(data.categories)) {
    throw new Error('Backup file must include tasks and categories arrays.');
  }

  const importedTasks = data.tasks;
  const importedCategories = data.categories;
  const importedActivity = Array.isArray(data.activityLog) ? data.activityLog : [];
  const importedSettings = data.settings && typeof data.settings === 'object' ? data.settings : null;

  withTransaction(() => {
    db.prepare('DELETE FROM subtasks').run();
    db.prepare('DELETE FROM tasks').run();
    db.prepare('DELETE FROM categories').run();
    db.prepare('DELETE FROM activity_log').run();

    const insertCat = db.prepare(
      'INSERT INTO categories (id, name, color, is_default, sort_order, created_at) VALUES (?, ?, ?, ?, ?, ?)'
    );
    const validCategoryIds = new Set<string>();
    importedCategories.forEach((cat, idx) => {
      if (!cat || typeof cat.name !== 'string' || !cat.name.trim()) return;
      const id = typeof cat.id === 'string' && cat.id.trim() ? cat.id.trim() : crypto.randomUUID();
      validCategoryIds.add(id);
      insertCat.run(
        id,
        cat.name.trim().slice(0, 48),
        typeof cat.color === 'string' && /^#[0-9A-Fa-f]{6}$/.test(cat.color)
          ? cat.color
          : '#2563EB',
        cat.isDefault ? 1 : 0,
        typeof cat.sortOrder === 'number' ? cat.sortOrder : idx,
        typeof cat.createdAt === 'string' ? cat.createdAt : new Date().toISOString()
      );
    });

    const insertTask = db.prepare(
      `INSERT INTO tasks (
        id, title, description, notes, status, important, priority,
        start_date, due_date, due_time, reminder_at, reminder_notified, category_id,
        tags_json, completed_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );
    const insertSub = db.prepare(
      'INSERT INTO subtasks (id, task_id, title, completed, sort_order) VALUES (?, ?, ?, ?, ?)'
    );

    for (const task of importedTasks) {
      if (!task || typeof task.title !== 'string' || !task.title.trim()) continue;
      const taskId =
        typeof task.id === 'string' && task.id.trim() ? task.id.trim() : crypto.randomUUID();
      const now = new Date().toISOString();
      const categoryId =
        typeof task.categoryId === 'string' && validCategoryIds.has(task.categoryId)
          ? task.categoryId
          : null;
      const dueDate = normalizeDateOrNull(task.dueDate);

      insertTask.run(
        taskId,
        task.title.trim().slice(0, 240),
        typeof task.description === 'string' ? task.description : '',
        typeof task.notes === 'string' ? task.notes : '',
        VALID_STATUSES.has(task.status) ? task.status : 'pending',
        task.important ? 1 : 0,
        VALID_PRIORITIES.has(task.priority) ? task.priority : 'medium',
        normalizeDateOrNull(task.startDate),
        dueDate,
        dueDate ? normalizeTimeOrNull(task.dueTime) : null,
        normalizeDateTimeOrNull(task.reminderAt),
        task.reminderNotified ? 1 : 0,
        categoryId,
        JSON.stringify(Array.isArray(task.tags) ? task.tags.filter((t) => typeof t === 'string') : []),
        task.completedAt ? String(task.completedAt) : null,
        typeof task.createdAt === 'string' ? task.createdAt : now,
        typeof task.updatedAt === 'string' ? task.updatedAt : now
      );

      if (Array.isArray(task.subtasks)) {
        task.subtasks.forEach((sub, idx) => {
          if (!sub || typeof sub.title !== 'string' || !sub.title.trim()) return;
          insertSub.run(
            typeof sub.id === 'string' && sub.id.trim() ? sub.id.trim() : crypto.randomUUID(),
            taskId,
            sub.title.trim().slice(0, 200),
            sub.completed ? 1 : 0,
            typeof sub.sortOrder === 'number' ? sub.sortOrder : idx
          );
        });
      }
    }

    if (importedActivity.length > 0) {
      const insertLog = db.prepare(
        'INSERT INTO activity_log (id, task_id, task_title, action, timestamp) VALUES (?, ?, ?, ?, ?)'
      );
      for (const entry of importedActivity.slice(0, 500)) {
        if (!entry || typeof entry.taskTitle !== 'string') continue;
        insertLog.run(
          typeof entry.id === 'string' ? entry.id : crypto.randomUUID(),
          entry.taskId ?? null,
          entry.taskTitle,
          typeof entry.action === 'string' ? entry.action : 'created',
          typeof entry.timestamp === 'string' ? entry.timestamp : new Date().toISOString()
        );
      }
    }

    if (importedSettings) {
      saveSettingsValues(importedSettings);
    }
  });

  return getBootstrapData();
}

export function clearAllData(resetCategories = false): BootstrapPayload {
  withTransaction(() => {
    db.prepare('DELETE FROM subtasks').run();
    db.prepare('DELETE FROM tasks').run();
    db.prepare('DELETE FROM activity_log').run();
    if (resetCategories) {
      db.prepare('DELETE FROM categories').run();
      const now = new Date().toISOString();
      const insertCat = db.prepare(
        'INSERT INTO categories (id, name, color, is_default, sort_order, created_at) VALUES (?, ?, ?, 1, ?, ?)'
      );
      DEFAULT_CATEGORIES.forEach((cat, idx) => {
        insertCat.run(cat.id, cat.name, cat.color, idx, now);
      });
    }
  });
  return getBootstrapData();
}
