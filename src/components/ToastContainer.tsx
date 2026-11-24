import React from 'react';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';
import { useTaskFlow } from '../context/TaskFlowContext.tsx';

export function ToastContainer() {
  const { toasts, dismissToast } = useTaskFlow();

  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 w-80 max-w-[calc(100vw-2rem)]"
    >
      {toasts.map((toast) => {
        const Icon =
          toast.tone === 'success'
            ? CheckCircle2
            : toast.tone === 'error' || toast.tone === 'warning'
            ? AlertCircle
            : Info;

        const iconTone =
          toast.tone === 'success'
            ? 'text-emerald-600 dark:text-emerald-400'
            : toast.tone === 'error'
            ? 'text-red-600 dark:text-red-400'
            : toast.tone === 'warning'
            ? 'text-amber-600 dark:text-amber-400'
            : 'text-blue-600 dark:text-blue-400';

        return (
          <div
            key={toast.id}
            className="flex items-start gap-2.5 p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-lg"
          >
            <Icon className={`h-4 w-4 mt-0.5 shrink-0 ${iconTone}`} />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                {toast.title}
              </p>
              {toast.description && (
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 truncate">
                  {toast.description}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => dismissToast(toast.id)}
              aria-label="Dismiss notification"
              className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-0.5"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
