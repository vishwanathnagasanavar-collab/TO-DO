import React from 'react';
import {
  AlertCircle,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  Clock,
  FolderKanban,
  LayoutDashboard,
  ListTodo,
  Settings,
  Star,
  Sun,
  CalendarClock,
  X,
} from 'lucide-react';
import { useTaskFlow } from '../context/TaskFlowContext.tsx';
import type { NavSection } from '../types.ts';
import { getLocalTodayISO, isDueToday, isOverdue, isUpcoming } from '../utils/date.ts';

interface SidebarProps {
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

export function Sidebar({ mobileOpen, onCloseMobile }: SidebarProps) {
  const {
    tasks,
    categories,
    activeNav,
    setActiveNav,
    selectedCategoryFilter,
    setSelectedCategoryFilter,
    settings,
    setSelectedTaskId,
  } = useTaskFlow();

  const todayISO = getLocalTodayISO();

  const counts = {
    tasks: tasks.filter((t) => t.status === 'pending').length,
    today: tasks.filter((t) => t.status === 'pending' && isDueToday(t, todayISO)).length,
    upcoming: tasks.filter((t) => isUpcoming(t, todayISO)).length,
    important: tasks.filter((t) => t.status === 'pending' && t.important).length,
    completed: tasks.filter((t) => t.status === 'completed').length,
    overdue: tasks.filter((t) => isOverdue(t, todayISO)).length,
  };

  const primaryNav: Array<{
    id: NavSection;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    count?: number;
    tone?: 'danger';
  }> = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'tasks', label: 'My Tasks', icon: ListTodo, count: tasks.length },
    { id: 'pending', label: 'Pending', icon: Clock, count: counts.tasks },
    { id: 'today', label: 'Today', icon: Sun, count: counts.today },
    { id: 'upcoming', label: 'Upcoming', icon: CalendarClock, count: counts.upcoming },
    { id: 'important', label: 'Important', icon: Star, count: counts.important },
    { id: 'completed', label: 'Completed', icon: CheckCircle2, count: counts.completed },
    {
      id: 'overdue',
      label: 'Overdue',
      icon: AlertCircle,
      count: counts.overdue,
      tone: counts.overdue > 0 ? 'danger' : undefined,
    },
  ];

  const workspaceNav: Array<{
    id: NavSection;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
  }> = [
    { id: 'categories', label: 'Categories', icon: FolderKanban },
    { id: 'calendar', label: 'Calendar', icon: CalendarDays },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const handleSelectNav = (id: NavSection) => {
    setActiveNav(id);
    if (id !== 'tasks') {
      setSelectedCategoryFilter(null);
    }
    setSelectedTaskId(null);
    onCloseMobile();
  };

  const handleSelectCategoryShortcut = (catId: string) => {
    setSelectedCategoryFilter(catId);
    setActiveNav('tasks');
    setSelectedTaskId(null);
    onCloseMobile();
  };

  const navContent = (
    <div className="flex h-full flex-col bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800">
      <div className="flex items-center justify-between px-5 h-16 border-b border-slate-200 dark:border-slate-800 shrink-0">
        <button
          type="button"
          onClick={() => handleSelectNav('dashboard')}
          className="flex items-center gap-2.5 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 rounded-md"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white font-display font-bold text-sm tracking-tight">
            TF
          </span>
          <span className="font-display text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100 whitespace-nowrap">
            TaskFlow
          </span>
        </button>
        <button
          type="button"
          onClick={onCloseMobile}
          aria-label="Close navigation menu"
          className="lg:hidden p-1.5 rounded-md text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        <nav aria-label="Task views" className="space-y-0.5">
          {primaryNav.map((item) => {
            const Icon = item.icon;
            const isActive = activeNav === item.id && !selectedCategoryFilter;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelectNav(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 ${
                  isActive
                    ? 'bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/70'
                }`}
              >
                <span className="flex items-center gap-2.5 min-w-0">
                  <Icon
                    className={`h-4 w-4 shrink-0 ${
                      isActive
                        ? 'text-blue-600 dark:text-blue-400'
                        : item.tone === 'danger'
                        ? 'text-red-600 dark:text-red-400'
                        : 'text-slate-400 dark:text-slate-500'
                    }`}
                  />
                  <span className="truncate">{item.label}</span>
                </span>
                {typeof item.count === 'number' && (
                  <span
                    className={`font-mono text-xs tabular-nums ml-2 shrink-0 ${
                      item.tone === 'danger' && item.count > 0
                        ? 'text-red-600 dark:text-red-400 font-semibold'
                        : isActive
                        ? 'text-blue-700 dark:text-blue-300'
                        : 'text-slate-400 dark:text-slate-500'
                    }`}
                  >
                    {item.count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="pt-3 border-t border-slate-200 dark:border-slate-800">
          <div className="px-3 mb-2 text-xs font-medium text-slate-400 dark:text-slate-500">
            Workspace
          </div>
          <nav aria-label="Workspace tools" className="space-y-0.5">
            {workspaceNav.map((item) => {
              const Icon = item.icon;
              const isActive = activeNav === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSelectNav(item.id)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 ${
                    isActive
                      ? 'bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/70'
                  }`}
                >
                  <Icon
                    className={`h-4 w-4 shrink-0 ${
                      isActive
                        ? 'text-blue-600 dark:text-blue-400'
                        : 'text-slate-400 dark:text-slate-500'
                    }`}
                  />
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        <div className="pt-3 border-t border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between px-3 mb-2">
            <span className="text-xs font-medium text-slate-400 dark:text-slate-500">
              Categories
            </span>
            <button
              type="button"
              onClick={() => handleSelectNav('categories')}
              className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline"
            >
              Manage
            </button>
          </div>
          <div className="space-y-0.5">
            {categories.map((cat) => {
              const catPendingCount = tasks.filter(
                (t) => t.status === 'pending' && t.categoryId === cat.id
              ).length;
              const isSelected = activeNav === 'tasks' && selectedCategoryFilter === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => handleSelectCategoryShortcut(cat.id)}
                  className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-sm transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 ${
                    isSelected
                      ? 'bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300 font-medium'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/70 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  <span className="flex items-center gap-2.5 min-w-0">
                    <span
                      className="h-2.5 w-2.5 rounded-sm shrink-0"
                      style={{ backgroundColor: cat.color }}
                      aria-hidden="true"
                    />
                    <span className="truncate">{cat.name}</span>
                  </span>
                  <span className="font-mono text-xs tabular-nums text-slate-400 dark:text-slate-500 ml-2 shrink-0">
                    {catPendingCount}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-800 shrink-0">
        <button
          type="button"
          onClick={() => handleSelectNav('settings')}
          className="w-full flex items-center gap-3 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800/70 transition-colors text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-display font-semibold text-xs shrink-0">
            {settings.profileName.trim().slice(0, 2).toUpperCase() || 'WU'}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
              {settings.profileName}
            </span>
            <span className="block text-xs text-slate-500 dark:text-slate-400 truncate">
              Preferences & Backup
            </span>
          </span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      <aside className="hidden lg:block w-64 shrink-0 h-screen sticky top-0">{navContent}</aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-950/50 backdrop-blur-[1px]"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <aside className="relative z-10 w-72 max-w-[85vw] h-full">{navContent}</aside>
        </div>
      )}
    </>
  );
}
