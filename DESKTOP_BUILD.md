# TaskFlow Desktop (Windows `.exe`) Build Guide

TaskFlow runs natively in Google AI Studio as a full-stack React + TypeScript + Express + SQLite (`node:sqlite`) web application, and includes the complete Electron wrapper (`electron/main.cjs`, `electron/preload.cjs`, `electron-builder.json`) to package a standalone Windows installer (`.exe`).

## Prerequisites on a Windows / Local Machine
- **Node.js 22.14+** (provides built-in `node:sqlite` and native TypeScript execution with zero C++ compiler requirements)
- **npm**

## Build Steps
1. Install project dependencies:
   ```bash
   npm install
   ```
2. Install Electron & `electron-builder` as dev dependencies locally:
   ```bash
   npm install -D electron electron-builder
   ```
3. Build the production frontend bundle:
   ```bash
   npm run build
   ```
4. Generate the Windows NSIS installer (`.exe`):
   ```bash
   npx electron-builder --config electron-builder.json --win
   ```

The installable `.exe` will be output to the `release/` folder. When installed and launched on Windows, Electron stores the SQLite database inside `%APPDATA%/TaskFlow/taskflow.db` automatically via `TASKFLOW_DB_PATH`.
