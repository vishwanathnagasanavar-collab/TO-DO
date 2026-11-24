import React, { useState } from 'react';
import { Menu, Moon, Plus, Sun } from 'lucide-react';
import { ConfirmDeleteModal } from './components/ConfirmDeleteModal.tsx';
import { Sidebar } from './components/Sidebar.tsx';
import { TaskDetailDrawer } from './components/TaskDetailDrawer.tsx';
import { TaskModal } from './components/TaskModal.tsx';
import { ToastContainer } from './components/ToastContainer.tsx';
import { TaskFlowProvider, useTaskFlow } from './context/TaskFlowContext.tsx';
import type { NavSection } from './types.ts';
import { AnalyticsView } from './views/AnalyticsView.tsx';
import { CalendarView } from './views/CalendarView.tsx';
import { CategoriesView } from './views/CategoriesView.tsx';
import { DashboardView } from './views/DashboardView.tsx';
import { SettingsView } from './views/SettingsView.tsx';
import { TaskListView } from './views/TaskListView.tsx';

const NAV_TITLES: Record<NavSection, string> = {
  dashboard: 'Dashboard',
  tasks: 'My Tasks',
  pending: 'Pending',
  today: 'Today',
  upcoming: 'Upcoming',
  important: 'Important',
  completed: 'Completed',
  overdue: 'Overdue',
  categories: 'Categories',
  calendar: 'Calendar',
  analytics: 'Analytics',
  settings: 'Settings',
};

function TaskFlowShell() {
  const {
    activeNav,
    categories,
    selectedCategoryFilter,
    settings,
    updateSettings,
    openCreateTaskModal,
    loading,
    error,
    refreshData,
    selectedTaskId,
    taskPendingDelete,
    cancelDeleteTask,
    confirmDeleteTask,
    isDeletingTask,
  } = useTaskFlow();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const selectedCategoryName = selectedCategoryFilter
    ? categories.find((c) => c.id === selectedCategoryFilter)?.name
    : undefined;

  const breadcrumbLabel = selectedCategoryName
    ? `${NAV_TITLES[activeNav]} / ${selectedCategoryName}`
    : NAV_TITLES[activeNav];

  return (
    <div className="min-h-screen flex bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      <Sidebar mobileOpen={mobileMenuOpen} onCloseMobile={() => setMobileMenuOpen(false)} />

      <div className="flex-1 min-w-0 flex flex-col">
        <header className="sticky top-0 z-30 h-16 px-4 sm:px-6 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xs border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open navigation menu"
              className="lg:hidden p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-2 text-sm min-w-0">
              <span className="text-slate-400 dark:text-slate-500 whitespace-nowrap hidden sm:inline">
                TaskFlow
              </span>
              <span className="text-slate-300 dark:text-slate-700 hidden sm:inline">/</span>
              <span className="font-medium text-slate-800 dark:text-slate-200 truncate">
                {breadcrumbLabel}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() =>
                void updateSettings({
                  theme: settings.theme === 'dark' ? 'light' : 'dark',
                })
              }
              aria-label={
                settings.theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'
              }
              className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              {settings.theme === 'dark' ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
            </button>

            <button
              type="button"
              onClick={() =>
                openCreateTaskModal({
                  categoryId: selectedCategoryFilter,
                })
              }
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-xs font-medium text-white transition-colors whitespace-nowrap shrink-0"
            >
              <Plus className="h-4 w-4" />
              <span>New Task</span>
            </button>
          </div>
        </header>

        <div className="flex-1 flex min-h-0">
          <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8 max-w-6xl w-full mx-auto">
            {loading ? (
              <div className="space-y-4 animate-pulse">
                <div className="h-8 w-64 rounded-lg bg-slate-200 dark:bg-slate-800" />
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {[0, 1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="h-24 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800"
                    />
                  ))}
                </div>
                <div className="h-64 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800" />
              </div>
            ) : error ? (
              <div className="p-8 rounded-xl bg-white dark:bg-slate-900 border border-red-200 dark:border-red-500/30 text-center space-y-3">
                <h2 className="font-display text-base font-semibold text-red-600 dark:text-red-400">
                  Unable to load workspace data
                </h2>
                <p className="text-sm text-slate-600 dark:text-slate-400">{error}</p>
                <button
                  type="button"
                  onClick={() => void refreshData()}
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-xs font-medium text-white"
                >
                  Retry Connection
                </button>
              </div>
            ) : (
              <>
                {activeNav === 'dashboard' && <DashboardView />}
                {(activeNav === 'tasks' ||
                  activeNav === 'pending' ||
                  activeNav === 'today' ||
                  activeNav === 'upcoming' ||
                  activeNav === 'important' ||
                  activeNav === 'completed' ||
                  activeNav === 'overdue') && <TaskListView section={activeNav} />}
                {activeNav === 'categories' && <CategoriesView />}
                {activeNav === 'calendar' && <CalendarView />}
                {activeNav === 'analytics' && <AnalyticsView />}
                {activeNav === 'settings' && <SettingsView />}
              </>
            )}
          </main>

          {selectedTaskId && <TaskDetailDrawer />}
        </div>
      </div>

      <TaskModal />
      <ConfirmDeleteModal
        open={Boolean(taskPendingDelete)}
        title="Delete this task?"
        description={
          taskPendingDelete
            ? `Are you sure you want to permanently delete "${taskPendingDelete.title}"? This action cannot be undone.`
            : ''
        }
        confirmLabel="Delete Task"
        busy={isDeletingTask}
        onCancel={cancelDeleteTask}
        onConfirm={() => void confirmDeleteTask()}
      />
      <ToastContainer />
    </div>
  );
}

export default function App() {
  return (
    <TaskFlowProvider>
      <TaskFlowShell />
    </TaskFlowProvider>
  );
}
