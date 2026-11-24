import React, { useMemo, useState } from 'react';
import { useTaskFlow } from '../context/TaskFlowContext.tsx';
import type { ActivityAction } from '../types.ts';
import {
  formatDateTime,
  getLocalTodayISO,
  isOverdue,
  parseISODate,
  toLocalISODate,
} from '../utils/date.ts';

export function AnalyticsView() {
  const { tasks, categories, activityLog, settings } = useTaskFlow();
  const [hoveredDayIndex, setHoveredDayIndex] = useState<number | null>(null);
  const [hoveredWeekIndex, setHoveredWeekIndex] = useState<number | null>(null);
  const [historyFilter, setHistoryFilter] = useState<ActivityAction | 'all'>('all');

  const todayISO = getLocalTodayISO();

  const summary = useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter((t) => t.status === 'completed').length;
    const pending = total - completed;
    const overdue = tasks.filter((t) => isOverdue(t, todayISO)).length;
    const completionPct = total > 0 ? Math.round((completed / total) * 100) : 0;

    const completedToday = tasks.filter(
      (t) => t.status === 'completed' && t.completedAt?.slice(0, 10) === todayISO
    ).length;

    // Weekly productivity (last 7 days)
    const sevenDaysAgoDate = parseISODate(todayISO);
    sevenDaysAgoDate.setDate(sevenDaysAgoDate.getDate() - 6);
    const sevenDaysAgoISO = toLocalISODate(sevenDaysAgoDate);
    const completedThisWeek = tasks.filter(
      (t) =>
        t.status === 'completed' &&
        t.completedAt &&
        t.completedAt.slice(0, 10) >= sevenDaysAgoISO
    ).length;

    // Monthly productivity (current calendar month)
    const monthPrefix = todayISO.slice(0, 7);
    const completedThisMonth = tasks.filter(
      (t) => t.status === 'completed' && t.completedAt?.slice(0, 7) === monthPrefix
    ).length;

    return {
      total,
      completed,
      pending,
      overdue,
      completionPct,
      completedToday,
      completedThisWeek,
      completedThisMonth,
    };
  }, [tasks, todayISO]);

  // Daily completed tasks (last 14 days)
  const dailySeries = useMemo(() => {
    const days: Array<{ iso: string; label: string; count: number }> = [];
    const base = parseISODate(todayISO);
    for (let i = 13; i >= 0; i--) {
      const d = new Date(base);
      d.setDate(base.getDate() - i);
      const iso = toLocalISODate(d);
      const count = tasks.filter(
        (t) => t.status === 'completed' && t.completedAt?.slice(0, 10) === iso
      ).length;
      days.push({
        iso,
        label: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        count,
      });
    }
    return days;
  }, [tasks, todayISO]);

  // Weekly productivity (last 8 weeks)
  const weeklySeries = useMemo(() => {
    const weeks: Array<{ label: string; completed: number; created: number }> = [];
    const base = parseISODate(todayISO);
    for (let w = 7; w >= 0; w--) {
      const weekEnd = new Date(base);
      weekEnd.setDate(base.getDate() - w * 7);
      const weekStart = new Date(weekEnd);
      weekStart.setDate(weekEnd.getDate() - 6);
      const startISO = toLocalISODate(weekStart);
      const endISO = toLocalISODate(weekEnd);

      const completed = tasks.filter((t) => {
        const d = t.completedAt?.slice(0, 10);
        return Boolean(d && d >= startISO && d <= endISO);
      }).length;

      const created = tasks.filter((t) => {
        const d = t.createdAt.slice(0, 10);
        return d >= startISO && d <= endISO;
      }).length;

      weeks.push({
        label: weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        completed,
        created,
      });
    }
    return weeks;
  }, [tasks, todayISO]);

  // Monthly productivity (last 6 months)
  const monthlySeries = useMemo(() => {
    const months: Array<{ key: string; label: string; completed: number; total: number }> = [];
    const base = parseISODate(todayISO);
    for (let m = 5; m >= 0; m--) {
      const d = new Date(base.getFullYear(), base.getMonth() - m, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const completed = tasks.filter(
        (t) => t.status === 'completed' && t.completedAt?.slice(0, 7) === key
      ).length;
      const created = tasks.filter((t) => t.createdAt.slice(0, 7) === key).length;
      months.push({
        key,
        label: d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
        completed,
        total: created,
      });
    }
    return months;
  }, [tasks, todayISO]);

  // Category breakdown
  const categoryStats = useMemo(() => {
    const rows = categories.map((cat) => {
      const catTasks = tasks.filter((t) => t.categoryId === cat.id);
      const completed = catTasks.filter((t) => t.status === 'completed').length;
      return {
        id: cat.id,
        name: cat.name,
        color: cat.color,
        total: catTasks.length,
        completed,
      };
    });
    const uncategorized = tasks.filter((t) => !t.categoryId);
    if (uncategorized.length > 0) {
      rows.push({
        id: 'uncategorized',
        name: 'Uncategorized',
        color: '#94A3B8',
        total: uncategorized.length,
        completed: uncategorized.filter((t) => t.status === 'completed').length,
      });
    }
    return rows;
  }, [categories, tasks]);

  const filteredHistory = useMemo(() => {
    if (historyFilter === 'all') return activityLog;
    return activityLog.filter((item) => item.action === historyFilter);
  }, [activityLog, historyFilter]);

  const maxDaily = Math.max(1, ...dailySeries.map((d) => d.count));
  const maxWeekly = Math.max(1, ...weeklySeries.flatMap((w) => [w.completed, w.created]));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
          Productivity Analytics
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Real-time completion metrics, trends, and activity history derived from your saved tasks.
        </p>
      </div>

      {/* Top Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400">Completion Rate</div>
          <div className="mt-2 font-mono text-2xl font-semibold tabular-nums text-blue-600 dark:text-blue-400">
            {summary.completionPct}%
          </div>
        </div>
        <div className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400">Completed Today</div>
          <div className="mt-2 font-mono text-2xl font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
            {summary.completedToday}
          </div>
        </div>
        <div className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400">Completed (7 Days)</div>
          <div className="mt-2 font-mono text-2xl font-semibold tabular-nums text-slate-900 dark:text-slate-100">
            {summary.completedThisWeek}
          </div>
        </div>
        <div className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400">Completed (Month)</div>
          <div className="mt-2 font-mono text-2xl font-semibold tabular-nums text-slate-900 dark:text-slate-100">
            {summary.completedThisMonth}
          </div>
        </div>
        <div className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 col-span-2 lg:col-span-1">
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400">Pending / Done</div>
          <div className="mt-2 font-mono text-2xl font-semibold tabular-nums text-slate-900 dark:text-slate-100">
            {summary.pending} / {summary.completed}
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Completed Chart */}
        <section className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-display text-sm font-semibold text-slate-900 dark:text-slate-100">
                Daily Completed Tasks (14 Days)
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Hover bars to inspect exact daily completions
              </p>
            </div>
            {hoveredDayIndex !== null && dailySeries[hoveredDayIndex] && (
              <span className="font-mono text-xs tabular-nums text-blue-600 dark:text-blue-400">
                {dailySeries[hoveredDayIndex].label}: {dailySeries[hoveredDayIndex].count}
              </span>
            )}
          </div>

          <div className="h-48 flex items-end gap-1.5 pt-4">
            {dailySeries.map((day, idx) => {
              const heightPct = day.count > 0 ? Math.max(8, Math.round((day.count / maxDaily) * 100)) : 4;
              return (
                <div
                  key={day.iso}
                  onMouseEnter={() => setHoveredDayIndex(idx)}
                  onMouseLeave={() => setHoveredDayIndex(null)}
                  className="flex-1 flex flex-col items-center justify-end h-full group"
                >
                  <div className="w-full flex-1 flex items-end">
                    <div
                      className={`w-full rounded-t transition-all duration-150 ${
                        day.count > 0
                          ? 'bg-blue-600 dark:bg-blue-500 group-hover:bg-blue-700 dark:group-hover:bg-blue-400'
                          : 'bg-slate-100 dark:bg-slate-800'
                      }`}
                      style={{ height: `${heightPct}%` }}
                      title={`${day.label}: ${day.count} completed`}
                    />
                  </div>
                  <span className="mt-2 font-mono text-[10px] tabular-nums text-slate-400 dark:text-slate-500">
                    {idx % 2 === 0 ? day.iso.slice(8) : ''}
                  </span>
                </div>
              );
            })}
          </div>
        </section>

        {/* Weekly Productivity Chart */}
        <section className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-display text-sm font-semibold text-slate-900 dark:text-slate-100">
                Weekly Output (8 Weeks)
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Created vs completed tasks per week
              </p>
            </div>
            {hoveredWeekIndex !== null && weeklySeries[hoveredWeekIndex] ? (
              <span className="font-mono text-xs tabular-nums text-slate-700 dark:text-slate-300">
                {weeklySeries[hoveredWeekIndex].label}: {weeklySeries[hoveredWeekIndex].completed} done /{' '}
                {weeklySeries[hoveredWeekIndex].created} added
              </span>
            ) : (
              <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                <span className="inline-flex items-center gap-1">
                  <span className="h-2 w-2 rounded-xs bg-slate-300 dark:bg-slate-600" />
                  Created
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="h-2 w-2 rounded-xs bg-emerald-600 dark:bg-emerald-500" />
                  Completed
                </span>
              </div>
            )}
          </div>

          <div className="h-48 flex items-end gap-3 pt-4">
            {weeklySeries.map((wk, idx) => {
              const createdH =
                wk.created > 0 ? Math.max(8, Math.round((wk.created / maxWeekly) * 100)) : 4;
              const completedH =
                wk.completed > 0 ? Math.max(8, Math.round((wk.completed / maxWeekly) * 100)) : 4;
              return (
                <div
                  key={wk.label}
                  onMouseEnter={() => setHoveredWeekIndex(idx)}
                  onMouseLeave={() => setHoveredWeekIndex(null)}
                  className="flex-1 flex flex-col items-center justify-end h-full"
                >
                  <div className="w-full flex-1 flex items-end justify-center gap-1">
                    <div
                      className="w-1/2 rounded-t bg-slate-200 dark:bg-slate-700 transition-all"
                      style={{ height: `${createdH}%` }}
                      title={`${wk.label} created: ${wk.created}`}
                    />
                    <div
                      className="w-1/2 rounded-t bg-emerald-600 dark:bg-emerald-500 transition-all"
                      style={{ height: `${completedH}%` }}
                      title={`${wk.label} completed: ${wk.completed}`}
                    />
                  </div>
                  <span className="mt-2 font-mono text-[10px] tabular-nums text-slate-400 dark:text-slate-500 truncate max-w-full">
                    {wk.label}
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      {/* Monthly Summary & Category Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <h2 className="font-display text-sm font-semibold text-slate-900 dark:text-slate-100 mb-4">
            Monthly Productivity (6 Months)
          </h2>
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {monthlySeries.map((m) => {
              const pct = m.total > 0 ? Math.min(100, Math.round((m.completed / m.total) * 100)) : 0;
              return (
                <div key={m.key} className="py-2.5 flex items-center gap-4 text-xs">
                  <span className="w-16 font-mono tabular-nums text-slate-600 dark:text-slate-300 shrink-0">
                    {m.label}
                  </span>
                  <div className="flex-1 h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-blue-600 dark:bg-blue-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="w-28 text-right font-mono tabular-nums text-slate-500 dark:text-slate-400 shrink-0">
                    {m.completed} done / {m.total} added
                  </span>
                </div>
              );
            })}
          </div>
        </section>

        <section className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <h2 className="font-display text-sm font-semibold text-slate-900 dark:text-slate-100 mb-4">
            Tasks by Category
          </h2>
          {categoryStats.length === 0 ? (
            <p className="text-xs text-slate-500 dark:text-slate-400">No categories available.</p>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {categoryStats.map((cat) => {
                const pct = cat.total > 0 ? Math.round((cat.completed / cat.total) * 100) : 0;
                return (
                  <div key={cat.id} className="py-2.5 flex items-center gap-3 text-xs">
                    <span
                      className="h-2.5 w-2.5 rounded-xs shrink-0"
                      style={{ backgroundColor: cat.color }}
                    />
                    <span className="w-28 truncate font-medium text-slate-700 dark:text-slate-200">
                      {cat.name}
                    </span>
                    <div className="flex-1 h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${pct}%`, backgroundColor: cat.color }}
                      />
                    </div>
                    <span className="w-20 text-right font-mono tabular-nums text-slate-500 dark:text-slate-400 shrink-0">
                      {cat.completed}/{cat.total} ({pct}%)
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {/* Task Completion History Log */}
      <section className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-4 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h2 className="font-display text-sm font-semibold text-slate-900 dark:text-slate-100">
              Task Completion & Activity History
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Preserved audit log of completed, created, reopened, and deleted tasks
            </p>
          </div>
          <div className="flex items-center gap-1 p-1 rounded-lg bg-slate-100 dark:bg-slate-800 self-start">
            {(['all', 'completed', 'created', 'reopened', 'deleted'] as const).map((act) => (
              <button
                key={act}
                type="button"
                onClick={() => setHistoryFilter(act)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium capitalize transition-colors whitespace-nowrap ${
                  historyFilter === act
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                {act}
              </button>
            ))}
          </div>
        </div>

        {filteredHistory.length === 0 ? (
          <div className="px-6 py-10 text-center text-xs text-slate-500 dark:text-slate-400">
            No task activity recorded yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400">
                <tr>
                  <th className="py-2.5 px-5 font-medium">Action</th>
                  <th className="py-2.5 px-5 font-medium">Task</th>
                  <th className="py-2.5 px-5 font-medium text-right">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredHistory.slice(0, 50).map((entry) => {
                  const toneMap: Record<ActivityAction, string> = {
                    completed: 'text-emerald-600 dark:text-emerald-400 font-medium',
                    created: 'text-blue-600 dark:text-blue-400 font-medium',
                    reopened: 'text-amber-600 dark:text-amber-400 font-medium',
                    deleted: 'text-red-600 dark:text-red-400 font-medium',
                  };
                  return (
                    <tr key={entry.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/30">
                      <td className={`py-2.5 px-5 capitalize ${toneMap[entry.action]}`}>
                        {entry.action}
                      </td>
                      <td className="py-2.5 px-5 text-slate-800 dark:text-slate-200 max-w-md truncate">
                        {entry.taskTitle}
                      </td>
                      <td className="py-2.5 px-5 text-right font-mono tabular-nums text-slate-500 dark:text-slate-400 whitespace-nowrap">
                        {formatDateTime(entry.timestamp, settings.dateFormat)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
