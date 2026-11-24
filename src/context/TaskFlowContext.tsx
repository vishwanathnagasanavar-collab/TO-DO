import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { api } from '../api/client.ts';
import type {
  ActivityEntry,
  AppSettings,
  Category,
  NavSection,
  Task,
  TaskDraft,
  TaskStatus,
} from '../types.ts';
import { getLocalTodayISO, isDueToday, isOverdue } from '../utils/date.ts';

export interface ToastMessage {
  id: string;
  title: string;
  description?: string;
  tone: 'info' | 'success' | 'warning' | 'error';
}

interface TaskFlowContextValue {
  tasks: Task[];
  categories: Category[];
  settings: AppSettings;
  activityLog: ActivityEntry[];
  loading: boolean;
  error: string | null;
  activeNav: NavSection;
  setActiveNav: (nav: NavSection) => void;
  selectedCategoryFilter: string | null;
  setSelectedCategoryFilter: (categoryId: string | null) => void;
  selectedTaskId: string | null;
  setSelectedTaskId: (taskId: string | null) => void;
  isTaskModalOpen: boolean;
  editingTask: Task | null;
  prefilledDueDate: string | null;
  prefilledCategoryId: string | null;
  openCreateTaskModal: (opts?: { dueDate?: string | null; categoryId?: string | null }) => void;
  openEditTaskModal: (task: Task) => void;
  closeTaskModal: () => void;
  toasts: ToastMessage[];
  pushToast: (toast: Omit<ToastMessage, 'id'>) => void;
  dismissToast: (id: string) => void;
  refreshData: () => Promise<void>;
  createTask: (draft: Partial<TaskDraft>) => Promise<Task>;
  updateTask: (
    id: string,
    patch: Partial<TaskDraft> & { status?: TaskStatus; reminderNotified?: boolean }
  ) => Promise<Task>;
  toggleTaskStatus: (task: Task) => Promise<void>;
  toggleTaskImportant: (task: Task) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  taskPendingDelete: Task | null;
  requestDeleteTask: (task: Task) => void;
  cancelDeleteTask: () => void;
  confirmDeleteTask: () => Promise<void>;
  isDeletingTask: boolean;
  deleteCompletedTasks: () => Promise<void>;
  addSubtask: (taskId: string, title: string) => Promise<void>;
  toggleSubtask: (subtaskId: string, completed: boolean) => Promise<void>;
  deleteSubtask: (subtaskId: string) => Promise<void>;
  createCategory: (name: string, color: string) => Promise<Category>;
  updateCategory: (id: string, patch: { name?: string; color?: string }) => Promise<Category>;
  deleteCategory: (id: string) => Promise<void>;
  updateSettings: (patch: Partial<AppSettings>) => Promise<void>;
  importBackup: (payload: unknown) => Promise<void>;
  clearAllData: (resetCategories?: boolean) => Promise<void>;
  notificationPermission: NotificationPermission | 'unsupported';
  requestNotificationPermission: () => Promise<NotificationPermission | 'unsupported'>;
}

const DEFAULT_SETTINGS: AppSettings = {
  theme: 'light',
  profileName: 'Workspace User',
  defaultPriority: 'medium',
  weekStartsOn: 'monday',
  dateFormat: 'MMM D, YYYY',
  notificationsEnabled: false,
  dueDateAlerts: true,
  overdueAlerts: true,
};

const TaskFlowContext = createContext<TaskFlowContextValue | null>(null);

export function TaskFlowProvider({ children }: { children: React.ReactNode }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [activityLog, setActivityLog] = useState<ActivityEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeNav, setActiveNav] = useState<NavSection>('dashboard');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [prefilledDueDate, setPrefilledDueDate] = useState<string | null>(null);
  const [prefilledCategoryId, setPrefilledCategoryId] = useState<string | null>(null);
  const [taskPendingDelete, setTaskPendingDelete] = useState<Task | null>(null);
  const [isDeletingTask, setIsDeletingTask] = useState(false);

  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [notificationPermission, setNotificationPermission] = useState<
    NotificationPermission | 'unsupported'
  >(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';
    return window.Notification.permission;
  });

  const digestNotifiedRef = useRef(false);

  const pushToast = useCallback((toast: Omit<ToastMessage, 'id'>) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setToasts((prev) => [...prev.slice(-3), { ...toast, id }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((item) => item.id !== id));
    }, 4500);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const refreshData = useCallback(async () => {
    try {
      setError(null);
      const data = await api.bootstrap();
      setTasks(data.tasks);
      setCategories(data.categories);
      setSettings(data.settings);
      setActivityLog(data.activityLog);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshData();
  }, [refreshData]);

  useEffect(() => {
    const root = document.documentElement;
    if (settings.theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [settings.theme]);

  const requestNotificationPermission = useCallback(async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      setNotificationPermission('unsupported');
      return 'unsupported';
    }
    const perm = await window.Notification.requestPermission();
    setNotificationPermission(perm);
    if (perm === 'granted') {
      const next = await api.updateSettings({ notificationsEnabled: true });
      setSettings(next);
      pushToast({
        title: 'Notifications enabled',
        description: 'Task reminders and deadline alerts are now active.',
        tone: 'success',
      });
    } else {
      pushToast({
        title: 'Permission not granted',
        description: 'Browser notifications remain disabled.',
        tone: 'warning',
      });
    }
    return perm;
  }, [pushToast]);

  // Reminder and deadline notification engine (only notifies when user enabled & granted permission)
  useEffect(() => {
    if (!settings.notificationsEnabled) return;
    if (notificationPermission !== 'granted') return;

    const sendSystemNotification = (title: string, body: string) => {
      try {
        if ('Notification' in window && window.Notification.permission === 'granted') {
          new window.Notification(title, { body });
        }
      } catch {
        // Ignore browser notification errors in restricted iframes
      }
      pushToast({ title, description: body, tone: 'info' });
    };

    const checkReminders = async () => {
      const nowMs = Date.now();
      const dueReminders = tasks.filter(
        (t) =>
          t.status === 'pending' &&
          t.reminderAt &&
          !t.reminderNotified &&
          new Date(t.reminderAt).getTime() <= nowMs
      );

      for (const task of dueReminders) {
        sendSystemNotification('Task Reminder', task.title);
        try {
          const updated = await api.updateTask(task.id, { reminderNotified: true });
          setTasks((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
        } catch {
          // Ignore background flag failure
        }
      }

      if (!digestNotifiedRef.current && tasks.length > 0) {
        digestNotifiedRef.current = true;
        const todayISO = getLocalTodayISO();
        const dueTodayCount = tasks.filter(
          (t) => t.status === 'pending' && isDueToday(t, todayISO)
        ).length;
        const overdueCount = tasks.filter((t) => isOverdue(t, todayISO)).length;

        if (settings.dueDateAlerts && dueTodayCount > 0) {
          sendSystemNotification(
            'Tasks Due Today',
            `You have ${dueTodayCount} pending task${dueTodayCount === 1 ? '' : 's'} due today.`
          );
        }
        if (settings.overdueAlerts && overdueCount > 0) {
          sendSystemNotification(
            'Overdue Tasks',
            `${overdueCount} task${overdueCount === 1 ? ' is' : 's are'} past due.`
          );
        }
      }
    };

    void checkReminders();
    const timer = window.setInterval(() => {
      void checkReminders();
    }, 15000);

    return () => window.clearInterval(timer);
  }, [
    tasks,
    settings.notificationsEnabled,
    settings.dueDateAlerts,
    settings.overdueAlerts,
    notificationPermission,
    pushToast,
  ]);

  const openCreateTaskModal = useCallback(
    (opts?: { dueDate?: string | null; categoryId?: string | null }) => {
      setEditingTask(null);
      setPrefilledDueDate(opts?.dueDate ?? null);
      setPrefilledCategoryId(opts?.categoryId ?? null);
      setIsTaskModalOpen(true);
    },
    []
  );

  const openEditTaskModal = useCallback((task: Task) => {
    setEditingTask(task);
    setPrefilledDueDate(null);
    setPrefilledCategoryId(null);
    setIsTaskModalOpen(true);
  }, []);

  const closeTaskModal = useCallback(() => {
    setIsTaskModalOpen(false);
    setEditingTask(null);
    setPrefilledDueDate(null);
    setPrefilledCategoryId(null);
  }, []);

  const reloadActivity = useCallback(async () => {
    const data = await api.bootstrap();
    setActivityLog(data.activityLog);
  }, []);

  const createTask = useCallback(
    async (draft: Partial<TaskDraft>) => {
      const created = await api.createTask(draft);
      setTasks((prev) => [created, ...prev]);
      void reloadActivity();
      pushToast({ title: 'Task created', description: created.title, tone: 'success' });
      return created;
    },
    [pushToast, reloadActivity]
  );

  const updateTask = useCallback(
    async (
      id: string,
      patch: Partial<TaskDraft> & { status?: TaskStatus; reminderNotified?: boolean }
    ) => {
      const updated = await api.updateTask(id, patch);
      setTasks((prev) => prev.map((t) => (t.id === id ? updated : t)));
      if (patch.status !== undefined) {
        void reloadActivity();
      }
      return updated;
    },
    [reloadActivity]
  );

  const toggleTaskStatus = useCallback(
    async (task: Task) => {
      const nextStatus: TaskStatus = task.status === 'completed' ? 'pending' : 'completed';
      const updated = await updateTask(task.id, { status: nextStatus });
      pushToast({
        title: nextStatus === 'completed' ? 'Task completed' : 'Task reopened',
        description: updated.title,
        tone: nextStatus === 'completed' ? 'success' : 'info',
      });
    },
    [pushToast, updateTask]
  );

  const toggleTaskImportant = useCallback(
    async (task: Task) => {
      await updateTask(task.id, { important: !task.important });
    },
    [updateTask]
  );

  const deleteTask = useCallback(
    async (id: string) => {
      const target = tasks.find((t) => t.id === id);
      await api.deleteTask(id);
      setTasks((prev) => prev.filter((t) => t.id !== id));
      if (selectedTaskId === id) setSelectedTaskId(null);
      void reloadActivity();
      pushToast({
        title: 'Task deleted',
        description: target?.title,
        tone: 'info',
      });
    },
    [pushToast, reloadActivity, selectedTaskId, tasks]
  );

  const requestDeleteTask = useCallback((task: Task) => {
    setTaskPendingDelete(task);
  }, []);

  const cancelDeleteTask = useCallback(() => {
    setTaskPendingDelete(null);
  }, []);

  const confirmDeleteTask = useCallback(async () => {
    if (!taskPendingDelete) return;
    setIsDeletingTask(true);
    try {
      await deleteTask(taskPendingDelete.id);
      setTaskPendingDelete(null);
    } catch (err) {
      pushToast({
        title: 'Could not delete task',
        description: (err as Error).message,
        tone: 'error',
      });
    } finally {
      setIsDeletingTask(false);
    }
  }, [deleteTask, pushToast, taskPendingDelete]);

  const deleteCompletedTasks = useCallback(async () => {
    const res = await api.deleteCompletedTasks();
    setTasks((prev) => {
      const remaining = prev.filter((t) => t.status !== 'completed');
      if (selectedTaskId && !remaining.some((t) => t.id === selectedTaskId)) {
        setSelectedTaskId(null);
      }
      return remaining;
    });
    void reloadActivity();
    pushToast({
      title: 'Completed tasks cleared',
      description: `Removed ${res.deletedCount} completed task${res.deletedCount === 1 ? '' : 's'}.`,
      tone: 'info',
    });
  }, [pushToast, reloadActivity, selectedTaskId]);

  const addSubtask = useCallback(async (taskId: string, title: string) => {
    const sub = await api.addSubtask(taskId, title);
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, subtasks: [...t.subtasks, sub] } : t))
    );
  }, []);

  const toggleSubtask = useCallback(async (subtaskId: string, completed: boolean) => {
    const updated = await api.updateSubtask(subtaskId, { completed });
    setTasks((prev) =>
      prev.map((t) =>
        t.id === updated.taskId
          ? {
              ...t,
              subtasks: t.subtasks.map((s) => (s.id === subtaskId ? updated : s)),
            }
          : t
      )
    );
  }, []);

  const deleteSubtask = useCallback(async (subtaskId: string) => {
    await api.deleteSubtask(subtaskId);
    setTasks((prev) =>
      prev.map((t) => ({
        ...t,
        subtasks: t.subtasks.filter((s) => s.id !== subtaskId),
      }))
    );
  }, []);

  const createCategory = useCallback(
    async (name: string, color: string) => {
      const created = await api.createCategory(name, color);
      setCategories((prev) => [...prev, created]);
      pushToast({ title: 'Category created', description: created.name, tone: 'success' });
      return created;
    },
    [pushToast]
  );

  const updateCategory = useCallback(
    async (id: string, patch: { name?: string; color?: string }) => {
      const updated = await api.updateCategory(id, patch);
      setCategories((prev) => prev.map((c) => (c.id === id ? updated : c)));
      pushToast({ title: 'Category updated', description: updated.name, tone: 'success' });
      return updated;
    },
    [pushToast]
  );

  const deleteCategory = useCallback(
    async (id: string) => {
      await api.deleteCategory(id);
      setCategories((prev) => prev.filter((c) => c.id !== id));
      setTasks((prev) => prev.map((t) => (t.categoryId === id ? { ...t, categoryId: null } : t)));
      if (selectedCategoryFilter === id) setSelectedCategoryFilter(null);
      pushToast({ title: 'Category deleted', tone: 'info' });
    },
    [pushToast, selectedCategoryFilter]
  );

  const updateSettings = useCallback(async (patch: Partial<AppSettings>) => {
    const updated = await api.updateSettings(patch);
    setSettings(updated);
  }, []);

  const importBackup = useCallback(
    async (payload: unknown) => {
      const data = await api.importData(payload);
      setTasks(data.tasks);
      setCategories(data.categories);
      setSettings(data.settings);
      setActivityLog(data.activityLog);
      pushToast({
        title: 'Data imported',
        description: `Loaded ${data.tasks.length} tasks and ${data.categories.length} categories.`,
        tone: 'success',
      });
    },
    [pushToast]
  );

  const clearAllData = useCallback(
    async (resetCategories = false) => {
      const data = await api.clearAllData(resetCategories);
      setTasks(data.tasks);
      setCategories(data.categories);
      setSettings(data.settings);
      setActivityLog(data.activityLog);
      setSelectedTaskId(null);
      pushToast({
        title: 'All data cleared',
        description: 'Task history and records have been removed.',
        tone: 'info',
      });
    },
    [pushToast]
  );

  const value = useMemo<TaskFlowContextValue>(
    () => ({
      tasks,
      categories,
      settings,
      activityLog,
      loading,
      error,
      activeNav,
      setActiveNav,
      selectedCategoryFilter,
      setSelectedCategoryFilter,
      selectedTaskId,
      setSelectedTaskId,
      isTaskModalOpen,
      editingTask,
      prefilledDueDate,
      prefilledCategoryId,
      openCreateTaskModal,
      openEditTaskModal,
      closeTaskModal,
      toasts,
      pushToast,
      dismissToast,
      refreshData,
      createTask,
      updateTask,
      toggleTaskStatus,
      toggleTaskImportant,
      deleteTask,
      taskPendingDelete,
      requestDeleteTask,
      cancelDeleteTask,
      confirmDeleteTask,
      isDeletingTask,
      deleteCompletedTasks,
      addSubtask,
      toggleSubtask,
      deleteSubtask,
      createCategory,
      updateCategory,
      deleteCategory,
      updateSettings,
      importBackup,
      clearAllData,
      notificationPermission,
      requestNotificationPermission,
    }),
    [
      tasks,
      categories,
      settings,
      activityLog,
      loading,
      error,
      activeNav,
      selectedCategoryFilter,
      selectedTaskId,
      isTaskModalOpen,
      editingTask,
      prefilledDueDate,
      prefilledCategoryId,
      openCreateTaskModal,
      openEditTaskModal,
      closeTaskModal,
      toasts,
      pushToast,
      dismissToast,
      refreshData,
      createTask,
      updateTask,
      toggleTaskStatus,
      toggleTaskImportant,
      deleteTask,
      taskPendingDelete,
      requestDeleteTask,
      cancelDeleteTask,
      confirmDeleteTask,
      isDeletingTask,
      deleteCompletedTasks,
      addSubtask,
      toggleSubtask,
      deleteSubtask,
      createCategory,
      updateCategory,
      deleteCategory,
      updateSettings,
      importBackup,
      clearAllData,
      notificationPermission,
      requestNotificationPermission,
    ]
  );

  return <TaskFlowContext.Provider value={value}>{children}</TaskFlowContext.Provider>;
}

export function useTaskFlow(): TaskFlowContextValue {
  const ctx = useContext(TaskFlowContext);
  if (!ctx) throw new Error('useTaskFlow must be used inside TaskFlowProvider');
  return ctx;
}
