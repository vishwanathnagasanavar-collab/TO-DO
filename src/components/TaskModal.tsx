import React, { useEffect, useState } from 'react';
import { Plus, Star, Trash2, X } from 'lucide-react';
import { useTaskFlow } from '../context/TaskFlowContext.tsx';
import type { Priority } from '../types.ts';
import { getLocalTodayISO } from '../utils/date.ts';

export function TaskModal() {
  const {
    isTaskModalOpen,
    editingTask,
    prefilledDueDate,
    prefilledCategoryId,
    closeTaskModal,
    categories,
    settings,
    createTask,
    updateTask,
    pushToast,
  } = useTaskFlow();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [notes, setNotes] = useState('');
  const [priority, setPriority] = useState<Priority>('medium');
  const [important, setImportant] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [dueTime, setDueTime] = useState('');
  const [reminderAt, setReminderAt] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [subtasks, setSubtasks] = useState<Array<{ id?: string; title: string; completed: boolean }>>([]);
  const [subtaskInput, setSubtaskInput] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const resetForNewTask = () => {
    setTitle('');
    setDescription('');
    setNotes('');
    setPriority(settings.defaultPriority);
    setImportant(false);
    setStartDate('');
    setDueDate(prefilledDueDate ?? '');
    setDueTime('');
    setReminderAt('');
    setCategoryId(prefilledCategoryId ?? '');
    setTags([]);
    setSubtasks([]);
    setTagInput('');
    setSubtaskInput('');
    setFormError(null);
  };

  useEffect(() => {
    if (!isTaskModalOpen) return;
    setFormError(null);
    setTagInput('');
    setSubtaskInput('');

    if (editingTask) {
      setTitle(editingTask.title);
      setDescription(editingTask.description);
      setNotes(editingTask.notes);
      setPriority(editingTask.priority);
      setImportant(editingTask.important);
      setStartDate(editingTask.startDate ?? '');
      setDueDate(editingTask.dueDate ?? '');
      setDueTime(editingTask.dueTime ?? '');
      setReminderAt(editingTask.reminderAt ? editingTask.reminderAt.slice(0, 16) : '');
      setCategoryId(editingTask.categoryId ?? '');
      setTags(editingTask.tags);
      setSubtasks(editingTask.subtasks.map((s) => ({ id: s.id, title: s.title, completed: s.completed })));
    } else {
      resetForNewTask();
    }
  }, [
    isTaskModalOpen,
    editingTask,
    prefilledDueDate,
    prefilledCategoryId,
    settings.defaultPriority,
  ]);

  if (!isTaskModalOpen) return null;

  const handleAddTag = () => {
    const cleaned = tagInput.trim().replace(/^#/, '');
    if (!cleaned) return;
    if (!tags.includes(cleaned)) {
      setTags((prev) => [...prev, cleaned]);
    }
    setTagInput('');
  };

  const handleAddSubtask = () => {
    const cleaned = subtaskInput.trim();
    if (!cleaned) return;
    setSubtasks((prev) => [...prev, { title: cleaned, completed: false }]);
    setSubtaskInput('');
  };

  const saveTask = async (keepOpenAfterCreate: boolean) => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setFormError('Please enter a task title.');
      return;
    }
    if (startDate && dueDate && dueDate < startDate) {
      setFormError('Due date cannot be earlier than start date.');
      return;
    }

    const effectiveDueDate = dueDate || (dueTime ? getLocalTodayISO() : '');

    setSubmitting(true);
    setFormError(null);
    try {
      const payload = {
        title: trimmedTitle,
        description: description.trim(),
        notes: notes.trim(),
        priority,
        important,
        startDate: startDate || null,
        dueDate: effectiveDueDate || null,
        dueTime: effectiveDueDate && dueTime ? dueTime : null,
        reminderAt: reminderAt || null,
        categoryId: categoryId || null,
        tags,
        subtasks,
      };

      if (editingTask) {
        await updateTask(editingTask.id, payload);
        pushToast({ title: 'Task updated', description: trimmedTitle, tone: 'success' });
        closeTaskModal();
      } else {
        await createTask(payload);
        if (keepOpenAfterCreate) {
          resetForNewTask();
        } else {
          closeTaskModal();
        }
      }
    } catch (err) {
      setFormError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await saveTask(false);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-[1px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="task-modal-title"
    >
      <div className="w-full max-w-2xl max-h-[90vh] flex flex-col rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 shrink-0">
          <h2
            id="task-modal-title"
            className="font-display text-lg font-semibold text-slate-900 dark:text-slate-100"
          >
            {editingTask ? 'Edit Task' : 'Create New Task'}
          </h2>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setImportant((v) => !v)}
              aria-label={important ? 'Unmark important' : 'Mark as important'}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                important
                  ? 'border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-500/40 dark:bg-amber-500/15 dark:text-amber-300'
                  : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              <Star className={`h-3.5 w-3.5 ${important ? 'fill-current' : ''}`} />
              <span>Important</span>
            </button>
            <button
              type="button"
              onClick={closeTaskModal}
              aria-label="Close modal"
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {formError && (
            <div className="px-3.5 py-2.5 rounded-lg bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 text-sm text-red-700 dark:text-red-300">
              {formError}
            </div>
          )}

          <div>
            <label
              htmlFor="task-title"
              className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
            >
              Task Title *
            </label>
            <input
              id="task-title"
              type="text"
              required
              maxLength={240}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Finalize quarterly roadmap presentation"
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>

          <div>
            <label
              htmlFor="task-description"
              className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
            >
              Description
            </label>
            <textarea
              id="task-description"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Summarize key deliverables or context..."
              className="w-full px-3.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="task-priority"
                className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
              >
                Priority
              </label>
              <select
                id="task-priority"
                value={priority}
                onChange={(e) => setPriority(e.target.value as Priority)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="task-category"
                className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
              >
                Category
              </label>
              <select
                id="task-category"
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600"
              >
                <option value="">Uncategorized</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label
                htmlFor="task-start-date"
                className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
              >
                Start Date
              </label>
              <input
                id="task-start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>

            <div>
              <label
                htmlFor="task-due-date"
                className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
              >
                Due Date
              </label>
              <input
                id="task-due-date"
                type="date"
                value={dueDate}
                onChange={(e) => {
                  setDueDate(e.target.value);
                  if (!e.target.value) setDueTime('');
                }}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>

            <div>
              <label
                htmlFor="task-due-time"
                className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
              >
                Due Time
              </label>
              <input
                id="task-due-time"
                type="time"
                value={dueTime}
                onChange={(e) => {
                  const val = e.target.value;
                  setDueTime(val);
                  if (val && !dueDate) {
                    setDueDate(getLocalTodayISO());
                  }
                }}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>

            <div>
              <label
                htmlFor="task-reminder"
                className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
              >
                Reminder
              </label>
              <input
                id="task-reminder"
                type="datetime-local"
                value={reminderAt}
                onChange={(e) => setReminderAt(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="task-tags"
              className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
            >
              Tags
            </label>
            <div className="flex gap-2">
              <input
                id="task-tags"
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ',') {
                    e.preventDefault();
                    handleAddTag();
                  }
                }}
                placeholder="Type a tag and press Enter"
                className="flex-1 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
              <button
                type="button"
                onClick={handleAddTag}
                className="px-3.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 whitespace-nowrap"
              >
                Add Tag
              </button>
            </div>
            {tags.length > 0 && (
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600 dark:text-slate-300">
                {tags.map((tag) => (
                  <span key={tag} className="inline-flex items-center gap-1">
                    <span className="font-mono">#{tag}</span>
                    <button
                      type="button"
                      onClick={() => setTags((prev) => prev.filter((t) => t !== tag))}
                      aria-label={`Remove tag ${tag}`}
                      className="text-slate-400 hover:text-red-600 dark:hover:text-red-400"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div>
            <label
              htmlFor="task-subtasks"
              className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
            >
              Subtasks
            </label>
            <div className="flex gap-2">
              <input
                id="task-subtasks"
                type="text"
                value={subtaskInput}
                onChange={(e) => setSubtaskInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddSubtask();
                  }
                }}
                placeholder="Add a step or checklist item"
                className="flex-1 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
              <button
                type="button"
                onClick={handleAddSubtask}
                className="inline-flex items-center gap-1 px-3.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 whitespace-nowrap"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add</span>
              </button>
            </div>
            {subtasks.length > 0 && (
              <ul className="mt-2.5 divide-y divide-slate-200 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-lg">
                {subtasks.map((sub, idx) => (
                  <li
                    key={sub.id ?? `${sub.title}-${idx}`}
                    className="flex items-center justify-between gap-3 px-3 py-2 text-sm"
                  >
                    <label className="flex items-center gap-2.5 min-w-0 flex-1 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={sub.completed}
                        onChange={() =>
                          setSubtasks((prev) =>
                            prev.map((item, i) =>
                              i === idx ? { ...item, completed: !item.completed } : item
                            )
                          )
                        }
                        className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-600"
                      />
                      <span
                        className={`truncate ${
                          sub.completed
                            ? 'line-through text-slate-400 dark:text-slate-500'
                            : 'text-slate-800 dark:text-slate-200'
                        }`}
                      >
                        {sub.title}
                      </span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setSubtasks((prev) => prev.filter((_, i) => i !== idx))}
                      aria-label="Delete subtask"
                      className="text-slate-400 hover:text-red-600 dark:hover:text-red-400 p-1"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <label
              htmlFor="task-notes"
              className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
            >
              Notes
            </label>
            <textarea
              id="task-notes"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Reference links, meeting notes, or implementation details..."
              className="w-full px-3.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>

          <div className="flex flex-wrap items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={closeTaskModal}
              className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 whitespace-nowrap"
            >
              Cancel
            </button>
            {!editingTask && (
              <button
                type="button"
                disabled={submitting}
                onClick={() => void saveTask(true)}
                className="px-4 py-2 rounded-lg border border-blue-600/30 bg-blue-50 dark:bg-blue-500/15 text-sm font-medium text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-500/25 disabled:opacity-60 transition-colors whitespace-nowrap"
              >
                Save &amp; Add Another
              </button>
            )}
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-sm font-medium text-white transition-colors whitespace-nowrap"
            >
              {submitting ? 'Saving...' : editingTask ? 'Save Changes' : 'Create Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
