import React, { useState } from 'react';
import {
  Bell,
  Calendar,
  Check,
  Edit3,
  Flag,
  Plus,
  Star,
  Trash2,
  X,
} from 'lucide-react';
import { useTaskFlow } from '../context/TaskFlowContext.tsx';
import {
  formatDate,
  formatDateTime,
  formatDueDisplay,
  isOverdue,
  PRIORITY_LABELS,
} from '../utils/date.ts';

export function TaskDetailDrawer() {
  const {
    tasks,
    categories,
    settings,
    selectedTaskId,
    setSelectedTaskId,
    toggleTaskStatus,
    toggleTaskImportant,
    openEditTaskModal,
    requestDeleteTask,
    addSubtask,
    toggleSubtask,
    deleteSubtask,
    updateTask,
    pushToast,
  } = useTaskFlow();

  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [notesDraft, setNotesDraft] = useState<string | null>(null);

  const task = tasks.find((t) => t.id === selectedTaskId);
  if (!task) return null;

  const category = categories.find((c) => c.id === task.categoryId);
  const overdue = isOverdue(task);

  const handleAddSubtask = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newSubtaskTitle.trim();
    if (!trimmed) return;
    try {
      await addSubtask(task.id, trimmed);
      setNewSubtaskTitle('');
    } catch (err) {
      pushToast({
        title: 'Could not add subtask',
        description: (err as Error).message,
        tone: 'error',
      });
    }
  };

  const handleSaveNotes = async () => {
    if (notesDraft === null || notesDraft === task.notes) return;
    try {
      await updateTask(task.id, { notes: notesDraft });
      setNotesDraft(null);
      pushToast({ title: 'Notes saved', tone: 'success' });
    } catch (err) {
      pushToast({
        title: 'Failed to save notes',
        description: (err as Error).message,
        tone: 'error',
      });
    }
  };

  const drawerContent = (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900">
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800 shrink-0">
        <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
          Task Details
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => openEditTaskModal(task)}
            aria-label="Edit task"
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <Edit3 className="h-3.5 w-3.5" />
            <span>Edit</span>
          </button>
          <button
            type="button"
            onClick={() => requestDeleteTask(task)}
            aria-label="Delete task"
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>Delete</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setNotesDraft(null);
              setSelectedTaskId(null);
            }}
            aria-label="Close task details"
            className="p-1.5 rounded-md text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="p-5 space-y-6 flex-1 overflow-y-auto">
        <div className="flex items-start gap-3">
          <button
            type="button"
            onClick={() => void toggleTaskStatus(task)}
            aria-label={task.status === 'completed' ? 'Mark pending' : 'Mark completed'}
            className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors ${
              task.status === 'completed'
                ? 'bg-emerald-600 border-emerald-600 text-white'
                : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-950'
            }`}
          >
            {task.status === 'completed' && <Check className="h-3.5 w-3.5 stroke-[2.5]" />}
          </button>
          <div className="flex-1 min-w-0">
            <h3
              className={`font-display text-base font-semibold leading-snug ${
                task.status === 'completed'
                  ? 'line-through text-slate-400 dark:text-slate-500'
                  : 'text-slate-900 dark:text-slate-100'
              }`}
            >
              {task.title}
            </h3>
            {task.description && (
              <p className="mt-1.5 text-sm text-slate-600 dark:text-slate-300 whitespace-pre-wrap">
                {task.description}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() => void toggleTaskImportant(task)}
            aria-label={task.important ? 'Unmark important' : 'Mark important'}
            className={`p-1 rounded-md shrink-0 ${
              task.important ? 'text-amber-500' : 'text-slate-400 hover:text-amber-500'
            }`}
          >
            <Star className={`h-4 w-4 ${task.important ? 'fill-current' : ''}`} />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void toggleTaskStatus(task)}
            className={`flex-1 inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-medium border transition-colors ${
              task.status === 'completed'
                ? 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'
                : 'border-emerald-600 bg-emerald-600 hover:bg-emerald-700 text-white'
            }`}
          >
            <Check className="h-3.5 w-3.5" />
            <span>{task.status === 'completed' ? 'Mark Pending' : 'Mark Complete'}</span>
          </button>
          <button
            type="button"
            onClick={() => openEditTaskModal(task)}
            className="px-3.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 whitespace-nowrap"
          >
            Edit Task
          </button>
        </div>

        <dl className="grid grid-cols-2 gap-y-3 gap-x-4 py-4 border-y border-slate-200 dark:border-slate-800 text-xs">
          <div>
            <dt className="text-slate-400 dark:text-slate-500 mb-0.5">Priority</dt>
            <dd className="inline-flex items-center gap-1.5 font-medium text-slate-800 dark:text-slate-200">
              <Flag className="h-3.5 w-3.5" />
              <span>{PRIORITY_LABELS[task.priority]}</span>
            </dd>
          </div>

          <div>
            <dt className="text-slate-400 dark:text-slate-500 mb-0.5">Category</dt>
            <dd className="inline-flex items-center gap-1.5 font-medium text-slate-800 dark:text-slate-200">
              {category ? (
                <>
                  <span
                    className="h-2.5 w-2.5 rounded-xs shrink-0"
                    style={{ backgroundColor: category.color }}
                  />
                  <span>{category.name}</span>
                </>
              ) : (
                <span className="text-slate-400">Uncategorized</span>
              )}
            </dd>
          </div>

          <div>
            <dt className="text-slate-400 dark:text-slate-500 mb-0.5">Start Date</dt>
            <dd className="font-mono tabular-nums text-slate-700 dark:text-slate-300">
              {task.startDate ? formatDate(task.startDate, settings.dateFormat) : 'Not set'}
            </dd>
          </div>

          <div>
            <dt className="text-slate-400 dark:text-slate-500 mb-0.5">Due Date &amp; Time</dt>
            <dd
              className={`inline-flex items-center gap-1 font-mono tabular-nums ${
                overdue
                  ? 'text-red-600 dark:text-red-400 font-medium'
                  : 'text-slate-700 dark:text-slate-300'
              }`}
            >
              <Calendar className="h-3.5 w-3.5 shrink-0" />
              <span>
                {task.dueDate
                  ? formatDueDisplay(task.dueDate, task.dueTime, settings.dateFormat)
                  : 'Not set'}
              </span>
            </dd>
          </div>

          <div className="col-span-2">
            <dt className="text-slate-400 dark:text-slate-500 mb-0.5">Reminder</dt>
            <dd className="inline-flex items-center gap-1.5 font-mono tabular-nums text-slate-700 dark:text-slate-300">
              <Bell className="h-3.5 w-3.5 shrink-0" />
              <span>
                {task.reminderAt ? formatDateTime(task.reminderAt, settings.dateFormat) : 'None'}
              </span>
            </dd>
          </div>

          {task.tags.length > 0 && (
            <div className="col-span-2">
              <dt className="text-slate-400 dark:text-slate-500 mb-0.5">Tags</dt>
              <dd className="font-mono text-slate-700 dark:text-slate-300">
                {task.tags.map((tag) => `#${tag}`).join(' · ')}
              </dd>
            </div>
          )}
        </dl>

        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Subtasks ({task.subtasks.filter((s) => s.completed).length}/{task.subtasks.length})
            </h4>
          </div>
          <ul className="space-y-1.5 mb-3">
            {task.subtasks.map((sub) => (
              <li
                key={sub.id}
                className="flex items-center justify-between gap-2 py-1 text-sm group"
              >
                <label className="flex items-center gap-2.5 min-w-0 flex-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={sub.completed}
                    onChange={() => void toggleSubtask(sub.id, !sub.completed)}
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
                  onClick={() => void deleteSubtask(sub.id)}
                  aria-label="Delete subtask"
                  className="opacity-0 group-hover:opacity-100 focus:opacity-100 text-slate-400 hover:text-red-600 p-1"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          </ul>
          <form onSubmit={handleAddSubtask} className="flex gap-2">
            <input
              type="text"
              value={newSubtaskTitle}
              onChange={(e) => setNewSubtaskTitle(e.target.value)}
              placeholder="Add subtask..."
              className="flex-1 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
            <button
              type="submit"
              aria-label="Add subtask"
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              <Plus className="h-4 w-4" />
            </button>
          </form>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label
              htmlFor="inspector-notes"
              className="text-xs font-semibold text-slate-700 dark:text-slate-300"
            >
              Notes
            </label>
            {notesDraft !== null && notesDraft !== task.notes && (
              <button
                type="button"
                onClick={() => void handleSaveNotes()}
                className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline"
              >
                Save notes
              </button>
            )}
          </div>
          <textarea
            id="inspector-notes"
            rows={4}
            value={notesDraft ?? task.notes}
            onChange={(e) => setNotesDraft(e.target.value)}
            onBlur={() => void handleSaveNotes()}
            placeholder="Write detailed task notes here..."
            className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-sm text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600"
          />
        </div>
      </div>
    </div>
  );

  return (
    <>
      <aside
        aria-label="Task details"
        className="hidden lg:block w-96 shrink-0 border-l border-slate-200 dark:border-slate-800 h-[calc(100vh-4rem)] sticky top-16"
      >
        {drawerContent}
      </aside>

      <div className="fixed inset-0 z-40 lg:hidden flex justify-end">
        <div
          className="fixed inset-0 bg-slate-950/50 backdrop-blur-[1px]"
          onClick={() => {
            setNotesDraft(null);
            setSelectedTaskId(null);
          }}
          aria-hidden="true"
        />
        <aside
          aria-label="Task details"
          className="relative z-10 w-full max-w-md h-full border-l border-slate-200 dark:border-slate-800 shadow-2xl"
        >
          {drawerContent}
        </aside>
      </div>
    </>
  );
}
