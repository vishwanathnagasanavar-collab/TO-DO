import type {
  AppSettings,
  BootstrapPayload,
  Category,
  Subtask,
  Task,
  TaskDraft,
  TaskStatus,
} from '../types.ts';

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...(options?.headers ?? {}),
    },
    ...options,
  });

  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const body = (await res.json()) as { error?: string };
      if (body?.error) message = body.error;
    } catch {
      // ignore json parse failure
    }
    throw new Error(message);
  }

  return (await res.json()) as T;
}

export const api = {
  bootstrap: () => request<BootstrapPayload>('/api/bootstrap'),

  createTask: (draft: Partial<TaskDraft>) =>
    request<Task>('/api/tasks', {
      method: 'POST',
      body: JSON.stringify(draft),
    }),

  updateTask: (
    id: string,
    patch: Partial<TaskDraft> & { status?: TaskStatus; reminderNotified?: boolean }
  ) =>
    request<Task>(`/api/tasks/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(patch),
    }),

  deleteTask: (id: string) =>
    request<{ ok: boolean }>(`/api/tasks/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    }),

  deleteCompletedTasks: () =>
    request<{ ok: boolean; deletedCount: number }>('/api/tasks/completed', {
      method: 'DELETE',
    }),

  addSubtask: (taskId: string, title: string) =>
    request<Subtask>(`/api/tasks/${encodeURIComponent(taskId)}/subtasks`, {
      method: 'POST',
      body: JSON.stringify({ title }),
    }),

  updateSubtask: (subtaskId: string, patch: { title?: string; completed?: boolean }) =>
    request<Subtask>(`/api/subtasks/${encodeURIComponent(subtaskId)}`, {
      method: 'PATCH',
      body: JSON.stringify(patch),
    }),

  deleteSubtask: (subtaskId: string) =>
    request<{ ok: boolean }>(`/api/subtasks/${encodeURIComponent(subtaskId)}`, {
      method: 'DELETE',
    }),

  createCategory: (name: string, color: string) =>
    request<Category>('/api/categories', {
      method: 'POST',
      body: JSON.stringify({ name, color }),
    }),

  updateCategory: (id: string, patch: { name?: string; color?: string }) =>
    request<Category>(`/api/categories/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(patch),
    }),

  deleteCategory: (id: string) =>
    request<{ ok: boolean }>(`/api/categories/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    }),

  updateSettings: (patch: Partial<AppSettings>) =>
    request<AppSettings>('/api/settings', {
      method: 'PATCH',
      body: JSON.stringify(patch),
    }),

  exportData: () => request<unknown>('/api/export'),

  importData: (payload: unknown) =>
    request<BootstrapPayload>('/api/import', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  clearAllData: (resetCategories = false) =>
    request<BootstrapPayload>(`/api/data?resetCategories=${resetCategories ? 'true' : 'false'}`, {
      method: 'DELETE',
    }),
};
