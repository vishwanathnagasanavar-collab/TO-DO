import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  ListTodo,
  Plus,
  Sun,
} from 'lucide-react';
import { TaskRow } from '../components/TaskRow.tsx';
import { useTaskFlow } from '../context/TaskFlowContext.tsx';
import {
  formatDate,
  formatShortDate,
  getGreeting,
  getLocalTodayISO,
  isDueToday,
  isOverdue,
  isUpcoming,
} from '../utils/date.ts';

export function DashboardView() {
  const {
    tasks,
    categories,
    settings,
    setActiveNav,
    openCreateTaskModal,
    createTask,
    toggleTaskStatus,
    pushToast,
  } = useTaskFlow();

  const [quickTitle, setQuickTitle] = useState('');
  const [quickDueToday, setQuickDueToday] = useState(true);
  const [addingQuick, setAddingQuick] = useState(false);

  const todayISO = getLocalTodayISO();
  const categoryMap = useMemo(
    () => new Map(categories.map((c) => [c.id, c])),
    [categories]
  );

  const stats = useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter((t) => t.status === 'completed').length;
    const pending = total - completed;
    const overdue = tasks.filter((t) => isOverdue(t, todayISO)).length;
    const productivityPct = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { total, completed, pending, overdue, productivityPct };
  }, [tasks, todayISO]);

  const todayTasks = useMemo(
    () =>
      tasks
        .filter((t) => t.status === 'pending' && isDueToday(t, todayISO))
        .sort((a, b) => Number(b.important) - Number(a.important)),
    [tasks, todayISO]
  );

  const upcomingTasks = useMemo(
    () =>
      tasks
        .filter((t) => isUpcoming(t, todayISO))
        .sort((a, b) => (a.dueDate ?? '').localeCompare(b.dueDate ?? ''))
        .slice(0, 6),
    [tasks, todayISO]
  );

  const recentlyCompleted = useMemo(
    () =>
      tasks
        .filter((t) => t.status === 'completed')
        .sort((a, b) => (b.completedAt ?? b.updatedAt).localeCompare(a.completedAt ?? a.updatedAt))
        .slice(0, 6),
    [tasks]
  );

  const todayReadable = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  const handleQuickAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = quickTitle.trim();
    if (!trimmed) return;
    setAddingQuick(true);
    try {
      await createTask({
        title: trimmed,
        priority: settings.defaultPriority,
        dueDate: quickDueToday ? todayISO : null,
      });
      setQuickTitle('');
    } catch (err) {
      pushToast({ title: 'Could not add task', description: (err as Error).message, tone: 'error' });
    } finally {
      setAddingQuick(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400">
            {todayReadable}
          </p>
          <h1 className="mt-1 font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            {getGreeting()}, {settings.profileName}
          </h1>
        </div>

        <form
          onSubmit={handleQuickAdd}
          className="flex flex-wrap sm:flex-nowrap items-center gap-2 w-full md:w-auto"
        >
          <input
            type="text"
            value={quickTitle}
            onChange={(e) => setQuickTitle(e.target.value)}
            placeholder="Quick add a task..."
            aria-label="Quick add task title"
            className="flex-1 sm:w-64 px-3.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600"
          />
          <button
            type="button"
            onClick={() => setQuickDueToday((v) => !v)}
            className={`px-3 py-2 rounded-lg border text-xs font-medium whitespace-nowrap transition-colors ${
              quickDueToday
                ? 'border-blue-600/30 bg-blue-50 text-blue-700 dark:border-blue-400/30 dark:bg-blue-500/15 dark:text-blue-300'
                : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            {quickDueToday ? 'Due Today' : 'No Date'}
          </button>
          <button
            type="submit"
            disabled={addingQuick || !quickTitle.trim()}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-xs font-medium text-white transition-colors whitespace-nowrap"
          >
            <Plus className="h-4 w-4" />
            <span>Add</span>
          </button>
        </form>
      </div>

      {/* 4-Column KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <button
          type="button"
          onClick={() => setActiveNav('tasks')}
          className="text-left p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
        >
          <div className="flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
            <span>Total Tasks</span>
            <ListTodo className="h-4 w-4 text-slate-400" />
          </div>
          <div className="mt-2 font-mono text-2xl font-semibold tabular-nums text-slate-900 dark:text-slate-100">
            {stats.total}
          </div>
        </button>

        <button
          type="button"
          onClick={() => setActiveNav('completed')}
          className="text-left p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
        >
          <div className="flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
            <span>Completed Tasks</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="mt-2 font-mono text-2xl font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
            {stats.completed}
          </div>
        </button>

        <button
          type="button"
          onClick={() => setActiveNav('pending')}
          className="text-left p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
        >
          <div className="flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
            <span>Pending Tasks</span>
            <Sun className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="mt-2 font-mono text-2xl font-semibold tabular-nums text-slate-900 dark:text-slate-100">
            {stats.pending}
          </div>
        </button>

        <button
          type="button"
          onClick={() => setActiveNav('overdue')}
          className="text-left p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
        >
          <div className="flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
            <span>Overdue Tasks</span>
            <AlertCircle
              className={`h-4 w-4 ${
                stats.overdue > 0 ? 'text-red-600 dark:text-red-400' : 'text-slate-400'
              }`}
            />
          </div>
          <div
            className={`mt-2 font-mono text-2xl font-semibold tabular-nums ${
              stats.overdue > 0
                ? 'text-red-600 dark:text-red-400'
                : 'text-slate-900 dark:text-slate-100'
            }`}
          >
            {stats.overdue}
          </div>
        </button>
      </div>

      {/* Productivity Progress Bar */}
      <section className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-sm font-semibold text-slate-900 dark:text-slate-100">
              Overall Productivity
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-mono tabular-nums">
              {stats.completed} of {stats.total} tasks completed
            </p>
          </div>
          <div className="font-mono text-xl font-semibold tabular-nums text-blue-600 dark:text-blue-400">
            {stats.productivityPct}%
          </div>
        </div>
        <div className="mt-3 h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
          <div
            className="h-full rounded-full bg-blue-600 dark:bg-blue-500 transition-all duration-300"
            style={{ width: `${stats.productivityPct}%` }}
          />
        </div>
      </section>

      {/* Main Workspace Columns */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
        {/* Today's Tasks (spans 2 columns on xl) */}
        <section className="xl:col-span-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <h2 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
                Today&apos;s Tasks
              </h2>
              <span className="font-mono text-xs tabular-nums text-slate-400">
                {todayTasks.length}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => openCreateTaskModal({ dueDate: todayISO })}
                className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline whitespace-nowrap"
              >
                + Add for today
              </button>
              <button
                type="button"
                onClick={() => setActiveNav('today')}
                className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 whitespace-nowrap"
              >
                <span>View all</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {todayTasks.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                No pending tasks scheduled for today
              </p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Add a task with today&apos;s date to keep your daily priorities focused.
              </p>
              <button
                type="button"
                onClick={() => openCreateTaskModal({ dueDate: todayISO })}
                className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-xs font-medium text-white transition-colors"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Schedule Task for Today</span>
              </button>
            </div>
          ) : (
            <div>
              {todayTasks.map((task) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  category={task.categoryId ? categoryMap.get(task.categoryId) : undefined}
                />
              ))}
            </div>
          )}
        </section>

        {/* Right Column: Upcoming Deadlines & Recently Completed */}
        <div className="space-y-6">
          <section className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800">
              <h2 className="font-display text-sm font-semibold text-slate-900 dark:text-slate-100">
                Upcoming Deadlines
              </h2>
              <button
                type="button"
                onClick={() => setActiveNav('upcoming')}
                className="text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
              >
                All upcoming
              </button>
            </div>
            {upcomingTasks.length === 0 ? (
              <div className="px-5 py-8 text-center text-xs text-slate-500 dark:text-slate-400">
                No upcoming deadlines scheduled.
              </div>
            ) : (
              <ul className="divide-y divide-slate-200/80 dark:divide-slate-800">
                {upcomingTasks.map((task) => {
                  const cat = task.categoryId ? categoryMap.get(task.categoryId) : undefined;
                  return (
                    <li
                      key={task.id}
                      className="flex items-center justify-between gap-3 px-5 py-3 text-sm"
                    >
                      <div className="min-w-0">
                        <p className="font-medium text-slate-800 dark:text-slate-200 truncate">
                          {task.title}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          {cat ? cat.name : 'Uncategorized'} ·{' '}
                          <span className="font-mono tabular-nums">
                            {formatShortDate(task.dueDate)}
                          </span>
                        </p>
                      </div>
                      <CalendarClock className="h-4 w-4 text-slate-400 shrink-0" />
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800">
              <h2 className="font-display text-sm font-semibold text-slate-900 dark:text-slate-100">
                Recently Completed
              </h2>
              <button
                type="button"
                onClick={() => setActiveNav('completed')}
                className="text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
              >
                History
              </button>
            </div>
            {recentlyCompleted.length === 0 ? (
              <div className="px-5 py-8 text-center text-xs text-slate-500 dark:text-slate-400">
                Completed tasks will appear here.
              </div>
            ) : (
              <ul className="divide-y divide-slate-200/80 dark:divide-slate-800">
                {recentlyCompleted.map((task) => (
                  <li
                    key={task.id}
                    className="flex items-center justify-between gap-3 px-5 py-3 text-sm"
                  >
                    <div className="min-w-0">
                      <p className="text-slate-500 dark:text-slate-400 line-through truncate">
                        {task.title}
                      </p>
                      <p className="text-xs font-mono tabular-nums text-slate-400 dark:text-slate-500 mt-0.5">
                        {formatDate((task.completedAt ?? task.updatedAt).slice(0, 10), settings.dateFormat)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => void toggleTaskStatus(task)}
                      className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline shrink-0"
                    >
                      Reopen
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
