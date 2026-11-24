import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import {
  addSubtask,
  clearAllData,
  createCategory,
  createTask,
  deleteCategory,
  deleteCompletedTasks,
  deleteSubtask,
  deleteTask,
  exportAllData,
  getBootstrapData,
  getTaskById,
  importAllData,
  updateCategory,
  updateSettings,
  updateSubtask,
  updateTask,
} from './server/db.ts';

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json({ limit: '5mb' }));

  app.get('/api/bootstrap', (_req, res) => {
    try {
      res.json(getBootstrapData());
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  app.get('/api/tasks/:id', (req, res) => {
    try {
      const task = getTaskById(req.params.id);
      if (!task) {
        res.status(404).json({ error: 'Task not found.' });
        return;
      }
      res.json(task);
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  app.post('/api/tasks', (req, res) => {
    try {
      const task = createTask(req.body ?? {});
      res.status(201).json(task);
    } catch (err) {
      res.status(400).json({ error: (err as Error).message });
    }
  });

  app.patch('/api/tasks/:id', (req, res) => {
    try {
      const task = updateTask(req.params.id, req.body ?? {});
      res.json(task);
    } catch (err) {
      const message = (err as Error).message;
      res.status(message === 'Task not found.' ? 404 : 400).json({ error: message });
    }
  });

  app.delete('/api/tasks/completed', (_req, res) => {
    try {
      const deletedCount = deleteCompletedTasks();
      res.json({ ok: true, deletedCount });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  app.delete('/api/tasks/:id', (req, res) => {
    try {
      deleteTask(req.params.id);
      res.json({ ok: true });
    } catch (err) {
      const message = (err as Error).message;
      res.status(message === 'Task not found.' ? 404 : 400).json({ error: message });
    }
  });

  app.post('/api/tasks/:id/subtasks', (req, res) => {
    try {
      const subtask = addSubtask(req.params.id, String(req.body?.title ?? ''));
      res.status(201).json(subtask);
    } catch (err) {
      res.status(400).json({ error: (err as Error).message });
    }
  });

  app.patch('/api/subtasks/:subtaskId', (req, res) => {
    try {
      const subtask = updateSubtask(req.params.subtaskId, req.body ?? {});
      res.json(subtask);
    } catch (err) {
      res.status(400).json({ error: (err as Error).message });
    }
  });

  app.delete('/api/subtasks/:subtaskId', (req, res) => {
    try {
      deleteSubtask(req.params.subtaskId);
      res.json({ ok: true });
    } catch (err) {
      res.status(400).json({ error: (err as Error).message });
    }
  });

  app.post('/api/categories', (req, res) => {
    try {
      const cat = createCategory(String(req.body?.name ?? ''), String(req.body?.color ?? '#2563EB'));
      res.status(201).json(cat);
    } catch (err) {
      res.status(400).json({ error: (err as Error).message });
    }
  });

  app.patch('/api/categories/:id', (req, res) => {
    try {
      const cat = updateCategory(req.params.id, req.body ?? {});
      res.json(cat);
    } catch (err) {
      res.status(400).json({ error: (err as Error).message });
    }
  });

  app.delete('/api/categories/:id', (req, res) => {
    try {
      deleteCategory(req.params.id);
      res.json({ ok: true });
    } catch (err) {
      res.status(400).json({ error: (err as Error).message });
    }
  });

  app.patch('/api/settings', (req, res) => {
    try {
      const next = updateSettings(req.body ?? {});
      res.json(next);
    } catch (err) {
      res.status(400).json({ error: (err as Error).message });
    }
  });

  app.get('/api/export', (_req, res) => {
    try {
      res.json(exportAllData());
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  app.post('/api/import', (req, res) => {
    try {
      const data = importAllData(req.body);
      res.json(data);
    } catch (err) {
      res.status(400).json({ error: (err as Error).message });
    }
  });

  app.delete('/api/data', (req, res) => {
    try {
      const resetCategories = req.query.resetCategories === 'true';
      const data = clearAllData(resetCategories);
      res.json(data);
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  const distDir = path.resolve(process.cwd(), 'dist');
  const isProd = process.env.NODE_ENV === 'production' && fs.existsSync(distDir);

  if (isProd) {
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`TaskFlow server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
