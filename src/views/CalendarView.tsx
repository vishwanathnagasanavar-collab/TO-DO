import React, { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { TaskRow } from '../components/TaskRow.tsx';
import { useTaskFlow } from '../context/TaskFlowContext.tsx';
import type { Task } from '../types.ts';
import {
  formatDate,
  getLocalTodayISO,
  getMonthGridDays,
  getWeekDays,
  getWeekdayLabels,
  parseISODate,
  toLocalISODate,
} from '../utils/date.ts';

type CalendarMode = 'month' | 'week' | 'day';

export function CalendarView() {
  const { tasks, categories, settings, openCreateTaskModal, setSelectedTaskId } = useTaskFlow();

  const todayISO = getLocalTodayISO();
  const [mode, setMode] = useState<CalendarMode>('month');
  const [anchorDateISO, setAnchorDateISO] = useState<string>(todayISO);
  const [selectedDateISO, setSelectedDateISO] = useState<string>(todayISO);

  const anchorDate = useMemo(() => parseISODate(anchorDateISO), [anchorDateISO]);
  const categoryMap = useMemo(
    () => new Map(categories.map((c) => [c.id, c])),
    [categories]
  );

  const tasksByDate = useMemo(() => {
    const map = new Map<string, Task[]>();
    for (const task of tasks) {
      if (!task.dueDate) continue;
      const list = map.get(task.dueDate) ?? [];
      list.push(task);
      map.set(task.dueDate, list);
    }
    return map;
  }, [tasks]);

  const monthDays = useMemo(
    () =>
      getMonthGridDays(
        anchorDate.getFullYear(),
        anchorDate.getMonth(),
        settings.weekStartsOn
      ),
    [anchorDate, settings.weekStartsOn]
  );

  const weekDays = useMemo(
    () => getWeekDays(anchorDate, settings.weekStartsOn),
    [anchorDate, settings.weekStartsOn]
  );

  const weekdayLabels = useMemo(
    () => getWeekdayLabels(settings.weekStartsOn),
    [settings.weekStartsOn]
  );

  const navigate = (direction: -1 | 1) => {
    const next = new Date(anchorDate);
    if (mode === 'month') {
      next.setMonth(next.getMonth() + direction);
    } else if (mode === 'week') {
      next.setDate(next.getDate() + direction * 7);
    } else {
      next.setDate(next.getDate() + direction);
      setSelectedDateISO(toLocalISODate(next));
    }
    setAnchorDateISO(toLocalISODate(next));
  };

  const jumpToToday = () => {
    setAnchorDateISO(todayISO);
    setSelectedDateISO(todayISO);
  };

  const periodTitle = useMemo(() => {
    if (mode === 'month') {
      return anchorDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    }
    if (mode === 'week') {
      const start = weekDays[0];
      const end = weekDays[6];
      return `${start.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      })} – ${end.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })}`;
    }
    return parseISODate(selectedDateISO).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  }, [anchorDate, mode, selectedDateISO, weekDays]);

  const selectedDayTasks = tasksByDate.get(selectedDateISO) ?? [];

  return (
    <div className="space-y-5">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Calendar
          </h1>
          <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
            View and schedule tasks across month, week, and daily timelines.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div
            className="inline-flex items-center p-1 rounded-lg bg-slate-100 dark:bg-slate-800"
            role="tablist"
            aria-label="Calendar view mode"
          >
            {(['month', 'week', 'day'] as CalendarMode[]).map((m) => (
              <button
                key={m}
                type="button"
                role="tab"
                aria-selected={mode === m}
                onClick={() => {
                  setMode(m);
                  if (m === 'day') setAnchorDateISO(selectedDateISO);
                }}
                className={`px-3 py-1.5 text-xs font-medium rounded-md capitalize transition-colors whitespace-nowrap ${
                  mode === m
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                {m}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => openCreateTaskModal({ dueDate: selectedDateISO })}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-xs font-medium text-white transition-colors whitespace-nowrap"
          >
            <Plus className="h-4 w-4" />
            <span>Add Task</span>
          </button>
        </div>
      </div>

      {/* Calendar Navigation Header */}
      <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate(-1)}
            aria-label="Previous period"
            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => navigate(1)}
            aria-label="Next period"
            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          <h2 className="ml-2 font-display text-base font-semibold text-slate-900 dark:text-slate-100">
            {periodTitle}
          </h2>
        </div>

        <button
          type="button"
          onClick={jumpToToday}
          className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 whitespace-nowrap"
        >
          Today
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
        {/* Calendar Surface */}
        <div className="xl:col-span-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden">
          {mode === 'month' && (
            <>
              <div className="grid grid-cols-7 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40">
                {weekdayLabels.map((label) => (
                  <div
                    key={label}
                    className="py-2.5 px-2 text-center text-xs font-medium text-slate-500 dark:text-slate-400"
                  >
                    {label}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 divide-x divide-y divide-slate-200 dark:divide-slate-800">
                {monthDays.map((day) => {
                  const iso = toLocalISODate(day);
                  const inCurrentMonth = day.getMonth() === anchorDate.getMonth();
                  const isToday = iso === todayISO;
                  const isSelected = iso === selectedDateISO;
                  const dayTasks = tasksByDate.get(iso) ?? [];

                  return (
                    <button
                      key={iso}
                      type="button"
                      onClick={() => setSelectedDateISO(iso)}
                      className={`min-h-[96px] p-2 text-left flex flex-col justify-between transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-600 ${
                        isSelected
                          ? 'bg-blue-50/70 dark:bg-blue-500/10'
                          : inCurrentMonth
                          ? 'bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                          : 'bg-slate-50/50 dark:bg-slate-950/40 text-slate-400 dark:text-slate-600'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span
                          className={`inline-flex h-6 w-6 items-center justify-center rounded-md font-mono text-xs tabular-nums ${
                            isToday
                              ? 'bg-blue-600 text-white font-semibold'
                              : inCurrentMonth
                              ? 'text-slate-800 dark:text-slate-200 font-medium'
                              : 'text-slate-400 dark:text-slate-600'
                          }`}
                        >
                          {day.getDate()}
                        </span>
                        {dayTasks.length > 0 && (
                          <span className="font-mono text-[11px] tabular-nums text-slate-400 dark:text-slate-500">
                            {dayTasks.length}
                          </span>
                        )}
                      </div>

                      <div className="mt-1.5 space-y-1 w-full">
                        {dayTasks.slice(0, 2).map((task) => {
                          const cat = task.categoryId ? categoryMap.get(task.categoryId) : undefined;
                          return (
                            <div
                              key={task.id}
                              className={`flex items-center gap-1.5 text-[11px] leading-tight truncate ${
                                task.status === 'completed'
                                  ? 'line-through text-slate-400 dark:text-slate-500'
                                  : 'text-slate-700 dark:text-slate-200'
                              }`}
                            >
                              <span
                                className="h-1.5 w-1.5 rounded-full shrink-0"
                                style={{
                                  backgroundColor:
                                    cat?.color ??
                                    (task.priority === 'urgent' ? '#DC2626' : '#2563EB'),
                                }}
                              />
                              <span className="truncate">{task.title}</span>
                            </div>
                          );
                        })}
                        {dayTasks.length > 2 && (
                          <div className="text-[11px] font-mono text-slate-400 dark:text-slate-500">
                            +{dayTasks.length - 2} more
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {mode === 'week' && (
            <div className="grid grid-cols-1 sm:grid-cols-7 divide-y sm:divide-y-0 sm:divide-x divide-slate-200 dark:divide-slate-800">
              {weekDays.map((day) => {
                const iso = toLocalISODate(day);
                const isToday = iso === todayISO;
                const isSelected = iso === selectedDateISO;
                const dayTasks = tasksByDate.get(iso) ?? [];

                return (
                  <div
                    key={iso}
                    onClick={() => setSelectedDateISO(iso)}
                    className={`min-h-[320px] p-3 flex flex-col cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-blue-50/60 dark:bg-blue-500/10'
                        : 'hover:bg-slate-50/70 dark:hover:bg-slate-800/30'
                    }`}
                  >
                    <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100 dark:border-slate-800">
                      <div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                          {day.toLocaleDateString('en-US', { weekday: 'short' })}
                        </div>
                        <div
                          className={`mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-md font-mono text-xs tabular-nums ${
                            isToday
                              ? 'bg-blue-600 text-white font-semibold'
                              : 'text-slate-900 dark:text-slate-100 font-semibold'
                          }`}
                        >
                          {day.getDate()}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedDateISO(iso);
                          openCreateTaskModal({ dueDate: iso });
                        }}
                        aria-label={`Add task for ${iso}`}
                        className="p-1 rounded text-slate-400 hover:text-blue-600 dark:hover:text-blue-400"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    <div className="space-y-2 flex-1">
                      {dayTasks.length === 0 ? (
                        <p className="text-xs text-slate-400 dark:text-slate-600">No tasks</p>
                      ) : (
                        dayTasks.map((task) => {
                          const cat = task.categoryId ? categoryMap.get(task.categoryId) : undefined;
                          return (
                            <button
                              key={task.id}
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedDateISO(iso);
                                setSelectedTaskId(task.id);
                              }}
                              className="w-full text-left p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 hover:border-blue-400 transition-colors"
                            >
                              <div className="flex items-center gap-1.5">
                                <span
                                  className="h-2 w-2 rounded-xs shrink-0"
                                  style={{ backgroundColor: cat?.color ?? '#2563EB' }}
                                />
                                <span
                                  className={`text-xs font-medium truncate ${
                                    task.status === 'completed'
                                      ? 'line-through text-slate-400'
                                      : 'text-slate-800 dark:text-slate-200'
                                  }`}
                                >
                                  {task.title}
                                </span>
                              </div>
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {mode === 'day' && (
            <div>
              <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40">
                <span className="text-xs font-medium text-slate-600 dark:text-slate-300 font-mono tabular-nums">
                  {selectedDayTasks.length} task{selectedDayTasks.length === 1 ? '' : 's'} scheduled
                </span>
                <button
                  type="button"
                  onClick={() => openCreateTaskModal({ dueDate: selectedDateISO })}
                  className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline"
                >
                  + Add task for this day
                </button>
              </div>
              {selectedDayTasks.length === 0 ? (
                <div className="px-6 py-16 text-center">
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    No tasks scheduled for {formatDate(selectedDateISO, settings.dateFormat)}
                  </p>
                  <button
                    type="button"
                    onClick={() => openCreateTaskModal({ dueDate: selectedDateISO })}
                    className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-xs font-medium text-white"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Schedule Task</span>
                  </button>
                </div>
              ) : (
                <div>
                  {selectedDayTasks.map((task) => (
                    <TaskRow
                      key={task.id}
                      task={task}
                      category={task.categoryId ? categoryMap.get(task.categoryId) : undefined}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Selected Date Agenda Panel */}
        <section className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800">
            <div>
              <h3 className="font-display text-sm font-semibold text-slate-900 dark:text-slate-100">
                {formatDate(selectedDateISO, settings.dateFormat)}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                {selectedDayTasks.length} task{selectedDayTasks.length === 1 ? '' : 's'} due
              </p>
            </div>
            <button
              type="button"
              onClick={() => openCreateTaskModal({ dueDate: selectedDateISO })}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-xs font-medium text-white whitespace-nowrap"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add</span>
            </button>
          </div>

          {selectedDayTasks.length === 0 ? (
            <div className="px-5 py-10 text-center text-xs text-slate-500 dark:text-slate-400">
              No tasks due on this date. Click &ldquo;Add&rdquo; to schedule one.
            </div>
          ) : (
            <div>
              {selectedDayTasks.map((task) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  category={task.categoryId ? categoryMap.get(task.categoryId) : undefined}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
