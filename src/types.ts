export type Priority = 'low' | 'medium' | 'high' | 'urgent';
export type TaskStatus = 'pending' | 'completed';
export type ThemeMode = 'light' | 'dark';
export type WeekStartDay = 'sunday' | 'monday';
export type DateFormatOption = 'MMM D, YYYY' | 'MM/DD/YYYY' | 'DD/MM/YYYY' | 'YYYY-MM-DD';
export type ActivityAction = 'created' | 'completed' | 'reopened' | 'deleted';
export type NavSection =
  | 'dashboard'
  | 'tasks'
  | 'pending'
  | 'today'
  | 'upcoming'
  | 'important'
  | 'completed'
  | 'overdue'
  | 'categories'
  | 'calendar'
  | 'analytics'
  | 'settings';

export type SortOption = 'newest' | 'oldest' | 'due_date' | 'priority' | 'alphabetical';
export type DueFilter = 'all' | 'today' | 'upcoming' | 'overdue' | 'no_date';
export type StatusFilter = 'all' | 'pending' | 'completed';

export interface Subtask {
  id: string;
  taskId: string;
  title: string;
  completed: boolean;
  sortOrder: number;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  notes: string;
  status: TaskStatus;
  important: boolean;
  priority: Priority;
  startDate: string | null;
  dueDate: string | null;
  dueTime: string | null;
  reminderAt: string | null;
  reminderNotified: boolean;
  categoryId: string | null;
  tags: string[];
  subtasks: Subtask[];
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: string;
  name: string;
  color: string;
  isDefault: boolean;
  sortOrder: number;
  createdAt: string;
}

export interface AppSettings {
  theme: ThemeMode;
  profileName: string;
  defaultPriority: Priority;
  weekStartsOn: WeekStartDay;
  dateFormat: DateFormatOption;
  notificationsEnabled: boolean;
  dueDateAlerts: boolean;
  overdueAlerts: boolean;
}

export interface ActivityEntry {
  id: string;
  taskId: string | null;
  taskTitle: string;
  action: ActivityAction;
  timestamp: string;
}

export interface BootstrapPayload {
  tasks: Task[];
  categories: Category[];
  settings: AppSettings;
  activityLog: ActivityEntry[];
}

export interface TaskDraft {
  title: string;
  description: string;
  notes: string;
  priority: Priority;
  important: boolean;
  startDate: string | null;
  dueDate: string | null;
  dueTime: string | null;
  reminderAt: string | null;
  categoryId: string | null;
  tags: string[];
  subtasks: Array<{ id?: string; title: string; completed: boolean }>;
}
