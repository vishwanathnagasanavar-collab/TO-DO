import React, { useState } from 'react';
import { ArrowRight, Check, Edit3, Plus, Trash2, X } from 'lucide-react';
import { useTaskFlow } from '../context/TaskFlowContext.tsx';
import type { Category } from '../types.ts';

const PRESET_COLORS = [
  '#2563EB',
  '#0891B2',
  '#059669',
  '#D97706',
  '#DC2626',
  '#7C3AED',
  '#DB2777',
  '#4F46E5',
  '#0D9488',
  '#64748B',
];

export function CategoriesView() {
  const {
    categories,
    tasks,
    createCategory,
    updateCategory,
    deleteCategory,
    setSelectedCategoryFilter,
    setActiveNav,
    openCreateTaskModal,
    pushToast,
  } = useTaskFlow();

  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState(PRESET_COLORS[0]);
  const [creating, setCreating] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('');

  const [confirmDeleteCat, setConfirmDeleteCat] = useState<Category | null>(null);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newName.trim();
    if (!trimmed) {
      pushToast({ title: 'Enter a category name', tone: 'warning' });
      return;
    }
    setCreating(true);
    try {
      await createCategory(trimmed, newColor);
      setNewName('');
      setNewColor(PRESET_COLORS[(categories.length + 1) % PRESET_COLORS.length]);
    } catch (err) {
      pushToast({ title: 'Could not create category', description: (err as Error).message, tone: 'error' });
    } finally {
      setCreating(false);
    }
  };

  const startEditing = (cat: Category) => {
    setEditingId(cat.id);
    setEditName(cat.name);
    setEditColor(cat.color);
  };

  const handleSaveEdit = async (id: string) => {
    const trimmed = editName.trim();
    if (!trimmed) {
      pushToast({ title: 'Category name cannot be empty', tone: 'warning' });
      return;
    }
    try {
      await updateCategory(id, { name: trimmed, color: editColor });
      setEditingId(null);
    } catch (err) {
      pushToast({ title: 'Update failed', description: (err as Error).message, tone: 'error' });
    }
  };

  const handleConfirmDelete = async () => {
    if (!confirmDeleteCat) return;
    try {
      await deleteCategory(confirmDeleteCat.id);
      setConfirmDeleteCat(null);
    } catch (err) {
      pushToast({ title: 'Delete failed', description: (err as Error).message, tone: 'error' });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
          Categories & Projects
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Organize tasks into custom groups with distinct color markers.
        </p>
      </div>

      {/* Create Category Form */}
      <form
        onSubmit={handleCreate}
        className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4"
      >
        <h2 className="font-display text-sm font-semibold text-slate-900 dark:text-slate-100">
          New Category
        </h2>
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            maxLength={48}
            placeholder="e.g., Research, Health, Client Work"
            aria-label="New category name"
            className="flex-1 px-3.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600"
          />

          <div className="flex items-center gap-2 flex-wrap">
            {PRESET_COLORS.map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => setNewColor(color)}
                aria-label={`Select color ${color}`}
                className={`h-6 w-6 rounded-md transition-transform ${
                  newColor === color
                    ? 'ring-2 ring-offset-2 ring-slate-900 dark:ring-white dark:ring-offset-slate-900 scale-110'
                    : 'hover:scale-105'
                }`}
                style={{ backgroundColor: color }}
              />
            ))}
            <input
              type="color"
              value={newColor}
              onChange={(e) => setNewColor(e.target.value)}
              aria-label="Custom category color"
              className="h-7 w-8 rounded border border-slate-200 dark:border-slate-700 cursor-pointer bg-transparent"
            />
          </div>

          <button
            type="submit"
            disabled={creating || !newName.trim()}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-sm font-medium text-white transition-colors whitespace-nowrap shrink-0"
          >
            <Plus className="h-4 w-4" />
            <span>Add Category</span>
          </button>
        </div>
      </form>

      {/* Category Cards Grid */}
      {categories.length === 0 ? (
        <div className="p-12 text-center rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
            No categories created yet.
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Use the form above to add your first category.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {categories.map((cat) => {
            const catTasks = tasks.filter((t) => t.categoryId === cat.id);
            const completedCount = catTasks.filter((t) => t.status === 'completed').length;
            const pendingCount = catTasks.length - completedCount;
            const pct = catTasks.length > 0 ? Math.round((completedCount / catTasks.length) * 100) : 0;
            const isEditing = editingId === cat.id;

            return (
              <div
                key={cat.id}
                className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col justify-between gap-4"
              >
                {isEditing ? (
                  <div className="space-y-3">
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      maxLength={48}
                      aria-label="Edit category name"
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {PRESET_COLORS.map((color) => (
                        <button
                          key={color}
                          type="button"
                          onClick={() => setEditColor(color)}
                          aria-label={`Choose color ${color}`}
                          className={`h-5 w-5 rounded ${
                            editColor === color ? 'ring-2 ring-slate-900 dark:ring-white' : ''
                          }`}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                      <input
                        type="color"
                        value={editColor}
                        onChange={(e) => setEditColor(e.target.value)}
                        aria-label="Custom edit color"
                        className="h-6 w-7 rounded border border-slate-200 dark:border-slate-700 cursor-pointer"
                      />
                    </div>
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => void handleSaveEdit(cat.id)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-xs font-medium text-white"
                      >
                        <Check className="h-3.5 w-3.5" />
                        <span>Save</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-600 dark:text-slate-300"
                      >
                        <X className="h-3.5 w-3.5" />
                        <span>Cancel</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span
                          className="h-3.5 w-3.5 rounded-sm shrink-0"
                          style={{ backgroundColor: cat.color }}
                        />
                        <h3 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100 truncate">
                          {cat.name}
                        </h3>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => startEditing(cat)}
                          aria-label={`Edit ${cat.name}`}
                          className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                        >
                          <Edit3 className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteCat(cat)}
                          aria-label={`Delete ${cat.name}`}
                          className="p-1.5 rounded-md text-slate-400 hover:text-red-600 dark:hover:text-red-400"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums mb-1.5">
                        <span>
                          {pendingCount} pending · {completedCount} completed
                        </span>
                        <span>{pct}%</span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-300"
                          style={{ width: `${pct}%`, backgroundColor: cat.color }}
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                      <button
                        type="button"
                        onClick={() => openCreateTaskModal({ categoryId: cat.id })}
                        className="font-medium text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400"
                      >
                        + Add task
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedCategoryFilter(cat.id);
                          setActiveNav('tasks');
                        }}
                        className="inline-flex items-center gap-1 font-medium text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        <span>Open tasks</span>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Delete Category Confirmation Modal */}
      {confirmDeleteCat && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 space-y-4">
            <h3 className="font-display text-lg font-semibold text-slate-900 dark:text-slate-100">
              Delete &ldquo;{confirmDeleteCat.name}&rdquo;?
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Tasks currently assigned to this category will be preserved as Uncategorized.
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setConfirmDeleteCat(null)}
                className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-700 dark:text-slate-300"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleConfirmDelete()}
                className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-sm font-medium text-white"
              >
                Delete Category
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
