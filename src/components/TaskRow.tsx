import React from 'react';
import {
  AlertTriangle,
  Bell,
  Calendar,
  Check,
  Edit3,
  Flag,
  ListChecks,
  Star,
  Trash2,
} from 'lucide-react';
import { useTaskFlow } from '../context/TaskFlowContext.tsx';
import type { Category, Task } from '../types.ts';
import {
  formatDateTime,
  formatDueDisplay,
  getLocalTodayISO,
  isOverdue,
  PRIORITY_LABELS,
} from '../utils/date.ts';

interface TaskRowProps {
  task: Task;
  category?: Category;
}

export function TaskRow({ task, category }: TaskRowProps) {
  const {
    settings,
    selectedTaskId,
    setSelectedTaskId,
    toggleTaskStatus,
    toggleTaskImportant,
    openEditTaskModal,
    requestDeleteTask,
  } = useTaskFlow();

  const todayISO = getLocalTodayISO();
  const overdue = isOverdue(task, todayISO);
  const completedSubtasks = task.subtasks.filter((s) => s.completed).length;
  const totalSubtasks = task.subtasks.length;
  const isSelected = selectedTaskId === task.id;

  const priorityTone: Record<Task['priority'], string> = {
    urgent: 'text-red-600 dark:text-red-400 font-medium',
    high: 'text-amber-600 dark:text-amber-400 font-medium',
    medium: 'text-slate-600 dark:text-slate-300',
    low: 'text-slate-400 dark:text-slate-500',
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => setSelectedTaskId(isSelected ? null : task.id)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          setSelectedTaskId(isSelected ? null : task.id);
        }
      }}
      className={`group flex items-start gap-3 px-4 py-3 border-b border-slate-200/80 dark:border-slate-800/90 last:border-b-0 transition-colors duration-150 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-600 ${
        isSelected
          ? 'bg-blue-50/70 dark:bg-blue-500/10'
          : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
      }`}
    >
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          void toggleTaskStatus(task);
        }}
        aria-label={task.status === 'completed' ? `Mark "${task.title}" pending` : `Complete "${task.title}"`}
        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 ${
          task.status === 'completed'
            ? 'bg-emerald-600 border-emerald-600 text-white dark:bg-emerald-500 dark:border-emerald-500'
            : 'border-slate-300 dark:border-slate-600 hover:border-blue-600 dark:hover:border-blue-400 bg-white dark:bg-slate-900'
        }`}
      >
        {task.status === 'completed' && <Check className="h-3.5 w-3.5 stroke-[2.5]" />}
      </button>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-3">
          <p
            className={`text-sm font-medium leading-snug break-words ${
              task.status === 'completed'
                ? 'line-through text-slate-400 dark:text-slate-500'
                : 'text-slate-900 dark:text-slate-100'
            }`}
          >
            {task.title}
          </p>

          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                void toggleTaskImportant(task);
              }}
              aria-label={task.important ? 'Remove from important' : 'Mark as important'}
              className={`p-1.5 rounded-md transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 ${
                task.important
                  ? 'text-amber-500 hover:text-amber-600 dark:text-amber-400'
                  : 'text-slate-300 dark:text-slate-600 opacity-0 group-hover:opacity-100 focus:opacity-100 hover:text-amber-500'
              }`}
            >
              <Star className={`h-4 w-4 ${task.important ? 'fill-current' : ''}`} />
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                openEditTaskModal(task);
              }}
              aria-label={`Edit "${task.title}"`}
              className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 dark:text-slate-500 dark:hover:text-slate-200 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
            >
              <Edit3 className="h-4 w-4" />
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                requestDeleteTask(task);
              }}
              aria-label={`Delete "${task.title}"`}
              className="p-1.5 rounded-md text-slate-400 hover:text-red-600 dark:text-slate-500 dark:hover:text-red-400 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-red-600"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>

        {task.description && (
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 line-clamp-1">
            {task.description}
          </p>
        )}

        <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
          <span className={`inline-flex items-center gap-1 ${priorityTone[task.priority]}`}>
            <Flag className="h-3 w-3 shrink-0" />
            <span>{PRIORITY_LABELS[task.priority]}</span>
          </span>

          {category && (
            <>
              <span aria-hidden="true" className="text-slate-300 dark:text-slate-700">
                ·
              </span>
              <span className="inline-flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                <span
                  className="h-2 w-2 rounded-xs shrink-0"
                  style={{ backgroundColor: category.color }}
                  aria-hidden="true"
                />
                <span>{category.name}</span>
              </span>
            </>
          )}

          {task.dueDate && (
            <>
              <span aria-hidden="true" className="text-slate-300 dark:text-slate-700">
                ·
              </span>
              <span
                className={`inline-flex items-center gap-1 font-mono tabular-nums ${
                  overdue
                    ? 'text-red-600 dark:text-red-400 font-medium'
                    : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                {overdue ? (
                  <AlertTriangle className="h-3 w-3 shrink-0" />
                ) : (
                  <Calendar className="h-3 w-3 shrink-0" />
                )}
                <span>
                  {overdue ? 'Overdue: ' : 'Due '}
                  {formatDueDisplay(task.dueDate, task.dueTime, settings.dateFormat)}
                </span>
              </span>
            </>
          )}

          {totalSubtasks > 0 && (
            <>
              <span aria-hidden="true" className="text-slate-300 dark:text-slate-700">
                ·
              </span>
              <span className="inline-flex items-center gap-1 font-mono tabular-nums">
                <ListChecks className="h-3 w-3 shrink-0" />
                <span>
                  {completedSubtasks}/{totalSubtasks}
                </span>
              </span>
            </>
          )}

          {task.reminderAt && task.status === 'pending' && (
            <>
              <span aria-hidden="true" className="text-slate-300 dark:text-slate-700">
                ·
              </span>
              <span className="inline-flex items-center gap-1 font-mono tabular-nums">
                <Bell className="h-3 w-3 shrink-0" />
                <span>{formatDateTime(task.reminderAt, settings.dateFormat)}</span>
              </span>
            </>
          )}

          {task.tags.length > 0 && (
            <>
              <span aria-hidden="true" className="text-slate-300 dark:text-slate-700">
                ·
              </span>
              <span className="text-slate-500 dark:text-slate-400">
                {task.tags.map((tag) => `#${tag}`).join(' ')}
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
