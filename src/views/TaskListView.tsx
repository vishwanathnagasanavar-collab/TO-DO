import React, { useMemo, useState } from 'react';
import { Filter, Plus, Search, Star, Trash2, X } from 'lucide-react';
import { ConfirmDeleteModal } from '../components/ConfirmDeleteModal.tsx';
import { TaskRow } from '../components/TaskRow.tsx';
import { useTaskFlow } from '../context/TaskFlowContext.tsx';
import type { DueFilter, NavSection, Priority, SortOption, StatusFilter } from '../types.ts';
import {
  getLocalTodayISO,
  isDueToday,
  isOverdue,
  isUpcoming,
  PRIORITY_WEIGHT,
} from '../utils/date.ts';

interface TaskListViewProps {
  section: Extract<
    NavSection,
    'tasks' | 'pending' | 'today' | 'upcoming' | 'important' | 'completed' | 'overdue'
  >;
}

const SECTION_COPY: Record<
  TaskListViewProps['section'],
  { title: string; emptyTitle: string; emptyBody: string }
> = {
  tasks: {
    title: 'My Tasks',
    emptyTitle: 'No tasks yet',
    emptyBody: 'Create your first task to organize deadlines, subtasks, and priorities.',
  },
  pending: {
    title: 'Pending Tasks',
    emptyTitle: 'No pending tasks',
    emptyBody: 'Every task is completed or none have been created yet.',
  },
  today: {
    title: 'Today',
    emptyTitle: 'Nothing due today',
    emptyBody: 'Tasks with today’s due date will appear here automatically.',
  },
  upcoming: {
    title: 'Upcoming',
    emptyTitle: 'No upcoming tasks',
    emptyBody: 'Tasks scheduled for future dates appear here in chronological order.',
  },
  important: {
    title: 'Important',
    emptyTitle: 'No important tasks',
    emptyBody: 'Star high-focus tasks to pin them into your Important list.',
  },
  completed: {
    title: 'Completed',
    emptyTitle: 'No completed tasks yet',
    emptyBody: 'Check off tasks to build your completion history and productivity stats.',
  },
  overdue: {
    title: 'Overdue',
    emptyTitle: 'All caught up',
    emptyBody: 'No pending tasks have passed their due date.',
  },
};

export function TaskListView({ section }: TaskListViewProps) {
  const {
    tasks,
    categories,
    selectedCategoryFilter,
    setSelectedCategoryFilter,
    openCreateTaskModal,
    deleteCompletedTasks,
    pushToast,
  } = useTaskFlow();

  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<Priority | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [dueFilter, setDueFilter] = useState<DueFilter>('all');
  const [importantOnly, setImportantOnly] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>(
    section === 'upcoming' || section === 'overdue' ? 'due_date' : 'newest'
  );
  const [confirmClearCompleted, setConfirmClearCompleted] = useState(false);
  const [clearingCompleted, setClearingCompleted] = useState(false);

  const todayISO = getLocalTodayISO();
  const categoryMap = useMemo(
    () => new Map(categories.map((c) => [c.id, c])),
    [categories]
  );

  const activeCategory = selectedCategoryFilter
    ? categoryMap.get(selectedCategoryFilter)
    : undefined;

  const completedCount = useMemo(
    () => tasks.filter((t) => t.status === 'completed').length,
    [tasks]
  );

  const filteredTasks = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    const base = tasks.filter((task) => {
      if (section === 'pending' && task.status !== 'pending') {
        return false;
      }
      if (section === 'today' && !(task.status === 'pending' && isDueToday(task, todayISO))) {
        return false;
      }
      if (section === 'upcoming' && !isUpcoming(task, todayISO)) {
        return false;
      }
      if (section === 'important' && !task.important) {
        return false;
      }
      if (section === 'completed' && task.status !== 'completed') {
        return false;
      }
      if (section === 'overdue' && !isOverdue(task, todayISO)) {
        return false;
      }

      if (selectedCategoryFilter && task.categoryId !== selectedCategoryFilter) {
        return false;
      }

      if (priorityFilter !== 'all' && task.priority !== priorityFilter) {
        return false;
      }

      if (statusFilter !== 'all' && task.status !== statusFilter) {
        return false;
      }

      if (importantOnly && !task.important) {
        return false;
      }

      if (dueFilter === 'today' && !isDueToday(task, todayISO)) return false;
      if (dueFilter === 'upcoming' && !isUpcoming(task, todayISO)) return false;
      if (dueFilter === 'overdue' && !isOverdue(task, todayISO)) return false;
      if (dueFilter === 'no_date' && task.dueDate !== null) return false;

      if (query) {
        const catName = task.categoryId ? categoryMap.get(task.categoryId)?.name ?? '' : '';
        const haystack = [
          task.title,
          task.description,
          task.notes,
          catName,
          ...task.tags,
        ]
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(query)) return false;
      }

      return true;
    });

    return [...base].sort((a, b) => {
      if (sortBy === 'newest') return b.createdAt.localeCompare(a.createdAt);
      if (sortBy === 'oldest') return a.createdAt.localeCompare(b.createdAt);
      if (sortBy === 'alphabetical') return a.title.localeCompare(b.title);
      if (sortBy === 'priority') {
        const diff = PRIORITY_WEIGHT[b.priority] - PRIORITY_WEIGHT[a.priority];
        if (diff !== 0) return diff;
        return (a.dueDate ?? '9999-12-31').localeCompare(b.dueDate ?? '9999-12-31');
      }
      if (sortBy === 'due_date') {
        if (!a.dueDate && !b.dueDate) return b.createdAt.localeCompare(a.createdAt);
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        const dateCmp = a.dueDate.localeCompare(b.dueDate);
        if (dateCmp !== 0) return dateCmp;
        return (a.dueTime ?? '23:59').localeCompare(b.dueTime ?? '23:59');
      }
      return 0;
    });
  }, [
    tasks,
    section,
    todayISO,
    selectedCategoryFilter,
    priorityFilter,
    statusFilter,
    dueFilter,
    importantOnly,
    searchQuery,
    categoryMap,
    sortBy,
  ]);

  const hasActiveFilters =
    Boolean(searchQuery.trim()) ||
    priorityFilter !== 'all' ||
    statusFilter !== 'all' ||
    dueFilter !== 'all' ||
    importantOnly ||
    Boolean(selectedCategoryFilter);

  const resetFilters = () => {
    setSearchQuery('');
    setPriorityFilter('all');
    setStatusFilter('all');
    setDueFilter('all');
    setImportantOnly(false);
    setSelectedCategoryFilter(null);
  };

  const handleConfirmDeleteCompleted = async () => {
    setClearingCompleted(true);
    try {
      await deleteCompletedTasks();
      setConfirmClearCompleted(false);
    } catch (err) {
      pushToast({
        title: 'Failed to clear completed tasks',
        description: (err as Error).message,
        tone: 'error',
      });
    } finally {
      setClearingCompleted(false);
    }
  };

  const copy = SECTION_COPY[section];

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            {activeCategory && (
              <span
                className="h-3 w-3 rounded-sm shrink-0"
                style={{ backgroundColor: activeCategory.color }}
              />
            )}
            <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              {activeCategory ? `${activeCategory.name} Tasks` : copy.title}
            </h1>
            <span className="font-mono text-sm tabular-nums text-slate-400">
              ({filteredTasks.length})
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-auto">
          {(section === 'completed' || section === 'tasks') && completedCount > 0 && (
            <button
              type="button"
              onClick={() => setConfirmClearCompleted(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-red-200 dark:border-red-500/30 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors whitespace-nowrap shrink-0"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Delete Completed ({completedCount})</span>
            </button>
          )}
          <button
            type="button"
            onClick={() =>
              openCreateTaskModal({
                dueDate: section === 'today' ? todayISO : null,
                categoryId: selectedCategoryFilter,
              })
            }
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-sm font-medium text-white transition-colors whitespace-nowrap shrink-0"
          >
            <Plus className="h-4 w-4" />
            <span>New Task</span>
          </button>
        </div>
      </div>

      {/* Search, Filters & Sorting Bar */}
      <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by title, description, category, or tag..."
              aria-label="Search tasks"
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <label htmlFor="sort-tasks" className="text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
              Sort by
            </label>
            <select
              id="sort-tasks"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs font-medium text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600"
            >
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="due_date">Due date</option>
              <option value="priority">Priority</option>
              <option value="alphabetical">Alphabetical (A–Z)</option>
            </select>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-1">
          <span className="inline-flex items-center gap-1 text-xs text-slate-400 mr-1">
            <Filter className="h-3.5 w-3.5" />
            <span>Filters:</span>
          </span>

          <select
            aria-label="Filter by priority"
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value as Priority | 'all')}
            className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600"
          >
            <option value="all">All Priorities</option>
            <option value="urgent">Urgent</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>

          <select
            aria-label="Filter by completion status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600"
          >
            <option value="all">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="completed">Completed</option>
          </select>

          <select
            aria-label="Filter by due date"
            value={dueFilter}
            onChange={(e) => setDueFilter(e.target.value as DueFilter)}
            className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600"
          >
            <option value="all">Any Due Date</option>
            <option value="today">Due Today</option>
            <option value="upcoming">Upcoming</option>
            <option value="overdue">Overdue</option>
            <option value="no_date">No Due Date</option>
          </select>

          <select
            aria-label="Filter by category"
            value={selectedCategoryFilter ?? ''}
            onChange={(e) => setSelectedCategoryFilter(e.target.value || null)}
            className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600"
          >
            <option value="">All Categories</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => setImportantOnly((v) => !v)}
            className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
              importantOnly
                ? 'border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-500/40 dark:bg-amber-500/15 dark:text-amber-300'
                : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            <Star className={`h-3.5 w-3.5 ${importantOnly ? 'fill-current' : ''}`} />
            <span>Important</span>
          </button>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={resetFilters}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline"
            >
              <X className="h-3.5 w-3.5" />
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>

      {/* Task List Container */}
      <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden">
        {filteredTasks.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <h2 className="font-display text-base font-semibold text-slate-800 dark:text-slate-200">
              {hasActiveFilters ? 'No tasks match your filters' : copy.emptyTitle}
            </h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
              {hasActiveFilters
                ? 'Try adjusting your search query or clearing one of the active filters.'
                : copy.emptyBody}
            </p>
            <div className="mt-5 flex items-center justify-center gap-3">
              {hasActiveFilters ? (
                <button
                  type="button"
                  onClick={resetFilters}
                  className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  Clear Filters
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() =>
                    openCreateTaskModal({
                      dueDate: section === 'today' ? todayISO : null,
                      categoryId: selectedCategoryFilter,
                    })
                  }
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-sm font-medium text-white transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  <span>Create Task</span>
                </button>
              )}
            </div>
          </div>
        ) : (
          <div>
            {filteredTasks.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                category={task.categoryId ? categoryMap.get(task.categoryId) : undefined}
              />
            ))}
          </div>
        )}
      </div>

      <ConfirmDeleteModal
        open={confirmClearCompleted}
        title="Delete all completed tasks?"
        description={`This will permanently delete ${completedCount} completed task${
          completedCount === 1 ? '' : 's'
        } from your database.`}
        confirmLabel="Delete Completed"
        busy={clearingCompleted}
        onCancel={() => setConfirmClearCompleted(false)}
        onConfirm={() => void handleConfirmDeleteCompleted()}
      />
    </div>
  );
}
