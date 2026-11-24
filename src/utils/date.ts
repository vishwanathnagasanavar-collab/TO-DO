import type { DateFormatOption, Priority, Task, WeekStartDay } from '../types.ts';

export function getLocalTodayISO(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function toLocalISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function parseISODate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

export function formatDate(iso: string | null, format: DateFormatOption): string {
  if (!iso) return 'No date';
  const datePart = iso.slice(0, 10);
  const parts = datePart.split('-');
  if (parts.length !== 3) return iso;
  const [y, m, d] = parts;
  if (format === 'YYYY-MM-DD') return `${y}-${m}-${d}`;
  if (format === 'MM/DD/YYYY') return `${m}/${d}/${y}`;
  if (format === 'DD/MM/YYYY') return `${d}/${m}/${y}`;
  const dateObj = parseISODate(datePart);
  return dateObj.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatShortDate(iso: string | null): string {
  if (!iso) return '';
  const today = getLocalTodayISO();
  if (iso === today) return 'Today';
  const tomorrowDate = parseISODate(today);
  tomorrowDate.setDate(tomorrowDate.getDate() + 1);
  if (iso === toLocalISODate(tomorrowDate)) return 'Tomorrow';
  const yesterdayDate = parseISODate(today);
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  if (iso === toLocalISODate(yesterdayDate)) return 'Yesterday';

  const dateObj = parseISODate(iso);
  return dateObj.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

export function formatTime(time24: string | null): string {
  if (!time24 || !/^\d{2}:\d{2}$/.test(time24)) return '';
  const [hStr, mStr] = time24.split(':');
  const h = Number(hStr);
  const m = Number(mStr);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function formatDueDisplay(
  dueDate: string | null,
  dueTime: string | null,
  format: DateFormatOption
): string {
  if (!dueDate) return 'No date';
  const datePart = formatDate(dueDate, format);
  if (!dueTime) return datePart;
  const timePart = formatTime(dueTime);
  return timePart ? `${datePart} · ${timePart}` : datePart;
}

export function formatDateTime(iso: string | null, dateFormat: DateFormatOption): string {
  if (!iso) return '';
  const dt = new Date(iso);
  if (Number.isNaN(dt.getTime())) return iso;
  const dateStr = formatDate(toLocalISODate(dt), dateFormat);
  const timeStr = dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return `${dateStr} · ${timeStr}`;
}

export function getLocalNowHHMM(): string {
  const now = new Date();
  const h = String(now.getHours()).padStart(2, '0');
  const m = String(now.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

export function isOverdue(task: Task, todayISO: string = getLocalTodayISO()): boolean {
  if (task.status === 'completed' || !task.dueDate) return false;
  if (task.dueDate < todayISO) return true;
  if (task.dueDate === todayISO && task.dueTime) {
    return task.dueTime < getLocalNowHHMM();
  }
  return false;
}

export function isDueToday(task: Task, todayISO: string = getLocalTodayISO()): boolean {
  if (!task.dueDate) return false;
  return task.dueDate === todayISO;
}

export function isUpcoming(task: Task, todayISO: string = getLocalTodayISO()): boolean {
  if (task.status === 'completed' || !task.dueDate) return false;
  return task.dueDate > todayISO;
}

export function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good Morning';
  if (hour < 17) return 'Good Afternoon';
  return 'Good Evening';
}

export function getMonthGridDays(year: number, month: number, weekStartsOn: WeekStartDay): Date[] {
  const firstDayOfMonth = new Date(year, month, 1);
  const startDayIndex = firstDayOfMonth.getDay(); // 0 = Sun ... 6 = Sat
  const offset = weekStartsOn === 'monday' ? (startDayIndex === 0 ? 6 : startDayIndex - 1) : startDayIndex;
  const startDate = new Date(year, month, 1 - offset);

  const days: Date[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(startDate);
    d.setDate(startDate.getDate() + i);
    days.push(d);
  }
  return days;
}

export function getWeekDays(anchorDate: Date, weekStartsOn: WeekStartDay): Date[] {
  const day = anchorDate.getDay();
  const offset = weekStartsOn === 'monday' ? (day === 0 ? 6 : day - 1) : day;
  const start = new Date(anchorDate);
  start.setDate(anchorDate.getDate() - offset);
  const days: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    days.push(d);
  }
  return days;
}

export function getWeekdayLabels(weekStartsOn: WeekStartDay): string[] {
  if (weekStartsOn === 'monday') {
    return ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  }
  return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
}

export const PRIORITY_WEIGHT: Record<Priority, number> = {
  urgent: 4,
  high: 3,
  medium: 2,
  low: 1,
};

export const PRIORITY_LABELS: Record<Priority, string> = {
  urgent: 'Urgent',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
};
