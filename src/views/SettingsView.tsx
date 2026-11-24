import React, { useRef, useState } from 'react';
import {
  Bell,
  Download,
  Moon,
  Sun,
  Trash2,
  Upload,
} from 'lucide-react';
import { api } from '../api/client.ts';
import { useTaskFlow } from '../context/TaskFlowContext.tsx';
import type { DateFormatOption, Priority, WeekStartDay } from '../types.ts';

export function SettingsView() {
  const {
    settings,
    updateSettings,
    importBackup,
    clearAllData,
    notificationPermission,
    requestNotificationPermission,
    pushToast,
  } = useTaskFlow();

  const [profileInput, setProfileInput] = useState(settings.profileName);
  const [savingProfile, setSavingProfile] = useState(false);

  const [confirmClearOpen, setConfirmClearOpen] = useState(false);
  const [resetCategories, setResetCategories] = useState(false);
  const [confirmPhrase, setConfirmPhrase] = useState('');

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = profileInput.trim();
    if (!trimmed) {
      pushToast({ title: 'Profile name cannot be empty', tone: 'warning' });
      return;
    }
    setSavingProfile(true);
    try {
      await updateSettings({ profileName: trimmed });
      pushToast({ title: 'Profile updated', tone: 'success' });
    } catch (err) {
      pushToast({ title: 'Update failed', description: (err as Error).message, tone: 'error' });
    } finally {
      setSavingProfile(false);
    }
  };

  const handleExport = async () => {
    try {
      const payload = await api.exportData();
      const blob = new Blob([JSON.stringify(payload, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `taskflow-backup-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      pushToast({ title: 'Backup exported', tone: 'success' });
    } catch (err) {
      pushToast({ title: 'Export failed', description: (err as Error).message, tone: 'error' });
    }
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as unknown;
      await importBackup(parsed);
    } catch (err) {
      pushToast({
        title: 'Import failed',
        description: (err as Error).message || 'Invalid JSON backup file.',
        tone: 'error',
      });
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleConfirmClear = async () => {
    if (confirmPhrase.trim().toUpperCase() !== 'CLEAR') return;
    try {
      await clearAllData(resetCategories);
      setConfirmClearOpen(false);
      setConfirmPhrase('');
      setResetCategories(false);
    } catch (err) {
      pushToast({ title: 'Failed to clear data', description: (err as Error).message, tone: 'error' });
    }
  };

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
          Settings
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Customize workspace appearance, task defaults, notification permissions, and local backups.
        </p>
      </div>

      {/* Appearance & Profile */}
      <section className="p-6 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-5">
        <h2 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
          Profile & Appearance
        </h2>

        <form onSubmit={handleSaveProfile} className="flex flex-col sm:flex-row sm:items-end gap-3">
          <div className="flex-1">
            <label
              htmlFor="settings-profile-name"
              className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
            >
              Profile Name
            </label>
            <input
              id="settings-profile-name"
              type="text"
              maxLength={60}
              value={profileInput}
              onChange={(e) => setProfileInput(e.target.value)}
              className="w-full px-3.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>
          <button
            type="submit"
            disabled={savingProfile}
            className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-sm font-medium text-white whitespace-nowrap"
          >
            {savingProfile ? 'Saving...' : 'Save Name'}
          </button>
        </form>

        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-4">
          <div>
            <div className="text-sm font-medium text-slate-900 dark:text-slate-100">Theme</div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              Switch between light and dark workspace surfaces
            </div>
          </div>

          <div className="inline-flex items-center p-1 rounded-lg bg-slate-100 dark:bg-slate-800">
            <button
              type="button"
              onClick={() => void updateSettings({ theme: 'light' })}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                settings.theme === 'light'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              <Sun className="h-3.5 w-3.5" />
              <span>Light</span>
            </button>
            <button
              type="button"
              onClick={() => void updateSettings({ theme: 'dark' })}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                settings.theme === 'dark'
                  ? 'bg-slate-900 text-slate-100 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              <Moon className="h-3.5 w-3.5" />
              <span>Dark</span>
            </button>
          </div>
        </div>
      </section>

      {/* Task & Calendar Preferences */}
      <section className="p-6 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
        <h2 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
          Task & Calendar Defaults
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label
              htmlFor="settings-priority"
              className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
            >
              Default Task Priority
            </label>
            <select
              id="settings-priority"
              value={settings.defaultPriority}
              onChange={(e) =>
                void updateSettings({ defaultPriority: e.target.value as Priority })
              }
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="settings-week-start"
              className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
            >
              Week Starting Day
            </label>
            <select
              id="settings-week-start"
              value={settings.weekStartsOn}
              onChange={(e) =>
                void updateSettings({ weekStartsOn: e.target.value as WeekStartDay })
              }
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600"
            >
              <option value="monday">Monday</option>
              <option value="sunday">Sunday</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="settings-date-format"
              className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
            >
              Date Format
            </label>
            <select
              id="settings-date-format"
              value={settings.dateFormat}
              onChange={(e) =>
                void updateSettings({ dateFormat: e.target.value as DateFormatOption })
              }
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600"
            >
              <option value="MMM D, YYYY">Nov 23, 2026</option>
              <option value="MM/DD/YYYY">11/23/2026</option>
              <option value="DD/MM/YYYY">23/11/2026</option>
              <option value="YYYY-MM-DD">2026-11-23</option>
            </select>
          </div>
        </div>
      </section>

      {/* Notification Preferences */}
      <section className="p-6 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
              Reminders & Notifications
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Browser permission status:{' '}
              <span className="font-mono font-medium text-slate-700 dark:text-slate-300">
                {notificationPermission}
              </span>
            </p>
          </div>

          {notificationPermission !== 'granted' && notificationPermission !== 'unsupported' && (
            <button
              type="button"
              onClick={() => void requestNotificationPermission()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-xs font-medium text-white whitespace-nowrap self-start"
            >
              <Bell className="h-3.5 w-3.5" />
              <span>Allow Browser Notifications</span>
            </button>
          )}
        </div>

        <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
          <label className="flex items-center justify-between gap-4 cursor-pointer">
            <div>
              <div className="text-sm font-medium text-slate-800 dark:text-slate-200">
                Enable Task Reminders
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                Notify only when browser permission is granted
              </div>
            </div>
            <input
              type="checkbox"
              checked={settings.notificationsEnabled && notificationPermission === 'granted'}
              onChange={(e) => {
                if (e.target.checked && notificationPermission !== 'granted') {
                  void requestNotificationPermission();
                } else {
                  void updateSettings({ notificationsEnabled: e.target.checked });
                }
              }}
              className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-600"
            />
          </label>

          <label className="flex items-center justify-between gap-4 cursor-pointer">
            <div>
              <div className="text-sm font-medium text-slate-800 dark:text-slate-200">
                Due-Date Alerts
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                Notify when pending tasks are due today
              </div>
            </div>
            <input
              type="checkbox"
              checked={settings.dueDateAlerts}
              onChange={(e) => void updateSettings({ dueDateAlerts: e.target.checked })}
              className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-600"
            />
          </label>

          <label className="flex items-center justify-between gap-4 cursor-pointer">
            <div>
              <div className="text-sm font-medium text-slate-800 dark:text-slate-200">
                Overdue Alerts
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                Notify when pending tasks pass their deadline
              </div>
            </div>
            <input
              type="checkbox"
              checked={settings.overdueAlerts}
              onChange={(e) => void updateSettings({ overdueAlerts: e.target.checked })}
              className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-600"
            />
          </label>
        </div>
      </section>

      {/* Data Management */}
      <section className="p-6 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
        <h2 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
          Data Backup & Reset
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          All tasks, categories, settings, and completion history are stored in a local SQLite database.
        </p>

        <div className="flex flex-wrap items-center gap-3 pt-1">
          <button
            type="button"
            onClick={() => void handleExport()}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 whitespace-nowrap"
          >
            <Download className="h-4 w-4" />
            <span>Export JSON Backup</span>
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            onChange={handleImportFile}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 whitespace-nowrap"
          >
            <Upload className="h-4 w-4" />
            <span>Import JSON Backup</span>
          </button>

          <button
            type="button"
            onClick={() => setConfirmClearOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-red-200 dark:border-red-500/30 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 whitespace-nowrap"
          >
            <Trash2 className="h-4 w-4" />
            <span>Clear All Data</span>
          </button>
        </div>
      </section>

      {/* Clear All Data Confirmation Modal */}
      {confirmClearOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 space-y-4">
            <h3 className="font-display text-lg font-semibold text-slate-900 dark:text-slate-100">
              Clear All TaskFlow Data?
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              This permanently removes all tasks, subtasks, and completion history from the SQLite database. Consider exporting a backup first.
            </p>

            <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={resetCategories}
                onChange={(e) => setResetCategories(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-red-600"
              />
              <span>Also reset categories to default list</span>
            </label>

            <div>
              <label
                htmlFor="confirm-clear-phrase"
                className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
              >
                Type <span className="font-mono font-semibold">CLEAR</span> to confirm
              </label>
              <input
                id="confirm-clear-phrase"
                type="text"
                value={confirmPhrase}
                onChange={(e) => setConfirmPhrase(e.target.value)}
                placeholder="CLEAR"
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 font-mono text-sm text-slate-900 dark:text-slate-100"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setConfirmClearOpen(false);
                  setConfirmPhrase('');
                }}
                className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-700 dark:text-slate-300"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={confirmPhrase.trim().toUpperCase() !== 'CLEAR'}
                onClick={() => void handleConfirmClear()}
                className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 disabled:opacity-40 text-sm font-medium text-white"
              >
                Permanently Clear
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
