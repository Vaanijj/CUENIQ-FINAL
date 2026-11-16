# CUE IQ — Spatial Snooker Telemetry & AI Intelligence Platform

**See the game differently. Your game. Every decision. Every shot. Understood.**

Cue IQ is a full-stack AI-powered snooker match analysis platform featuring a reactive 3D Quantum Gyroscopic Core, OpenCV optical video analysis, interactive championship table trajectory visualization, and a context-aware AI Tactical Coach.

---

## Architecture

- **Frontend (`frontend/`)**: Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS, Framer Motion, Three.js, React Three Fiber (`@react-three/fiber`, `@react-three/drei`), and custom GLSL shaders.
- **Backend (`backend/`)**: Python FastAPI / Unified HTTP + SQLite3 Engine, OpenCV computer vision pipeline, background video processing, and REST APIs.

---

## Quick Start

### 1. Start the Backend Server (`http://127.0.0.1:8000`)

```bash
cd backend
python3 run_server.py
```

### 2. Start the Frontend Application (`http://localhost:3000`)

```bash
cd frontend
npm install
npm run dev
```

Or for production:

```bash
cd frontend
npm run build
npm run start -- -p 3000
```
