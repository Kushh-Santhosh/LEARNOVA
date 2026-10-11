# LEARNOVA — Vercel Deployment Guide

This guide details the verified deployment strategy for LEARNOVA on Vercel.

---

## 1. Architecture & Deployment Strategy

LEARNOVA consists of:
1. **Frontend**: Vite + React single-page application (`frontend/`)
2. **Backend**: FastAPI Python asynchronous engine (`backend/`)
3. **Database & Auth**: Supabase PostgreSQL (`backend/migrations/001_initial_schema.sql`)
4. **Primary LLM Gateway**: OpenRouter ($0.00 free-model failover)

### Recommended Vercel Setup: Split Services (Vite Frontend + FastAPI Backend)
The safest, most scalable architecture separates frontend and backend:
- **Frontend (Vercel)**: Deployed as a high-performance static/SPA project on Vercel edge.
- **Backend (Render / Railway / Fly.io / AWS / Vercel Python)**: Deployed with persistent FastAPI ASGI process.

---

## 2. Frontend Deployment on Vercel

### Step 1: Create Project in Vercel
1. In the Vercel Dashboard, select **Add New > Project** and import the `LEARNOVA` GitHub repository.
2. Configure **Root Directory**: `frontend` (or keep root if using root `vercel.json`).
3. **Framework Preset**: Vite
4. **Build Command**: `npm run build`
5. **Output Directory**: `dist`

### Step 2: Environment Variables (Client-Safe Only)
Set the following environment variable in the Vercel Project Settings:

| Variable | Description | Example |
| :--- | :--- | :--- |
| `VITE_API_BASE_URL` | Public URL of your deployed LEARNOVA backend API | `https://api.learnova.example.com` |

> ⚠️ **SECURITY WARNING**: Never add secret keys (`OPENROUTER_API_KEY`, `SUPABASE_SECRET_KEY`, `LIVEKIT_API_SECRET`) to `VITE_` variables. They are compiled into the client JavaScript bundle.

---

## 3. Backend Deployment Configuration

When deploying the FastAPI backend, set these server-only environment variables:

| Variable | Security | Description |
| :--- | :--- | :--- |
| `PORT` | Server-Only | Port to bind (default: `8000`) |
| `HOST` | Server-Only | Host to bind (`0.0.0.0`) |
| `OPENROUTER_API_KEY` | Server-Only | OpenRouter API Key (free-tier models only) |
| `SUPABASE_URL` | Server-Only | `https://<project-ref>.supabase.co` |
| `SUPABASE_PUBLISHABLE_KEY` | Client-Safe | Supabase anon key |
| `SUPABASE_SECRET_KEY` | Server-Only | Supabase service_role key (optional; for server admin) |
| `LIVEKIT_URL` | Server-Only | Optional real-time voice URL |
| `LIVEKIT_API_KEY` | Server-Only | Optional LiveKit key |
| `LIVEKIT_API_SECRET` | Server-Only | Optional LiveKit secret |

---

## 4. Supabase Database Migration

Before production use with remote persistence, run the idempotent schema migration:
1. Open your Supabase Dashboard: `https://supabase.com/dashboard/project/<your-project-ref>`.
2. Navigate to **SQL Editor**.
3. Copy and execute the contents of [`backend/migrations/001_initial_schema.sql`](../backend/migrations/001_initial_schema.sql).
4. Verify all 8 tables are created (`users`, `learning_documents`, `conversations`, `messages`, `learner_progress`, `website_knowledge_bases`, `website_pages`, `screen_guidance_sessions`).

If Supabase is unconfigured or unreachable, LEARNOVA's local in-memory fallback automatically takes over without crashing.

---

## 5. Browser Extension Configuration for Production

When distributing the browser extension for production:
1. The extension defaults to `http://localhost:8000` for local pair programming.
2. In the extension popup or settings, set `custom_api_url` to your production backend URL (e.g., `https://api.learnova.example.com`).
3. The background service worker automatically routes `TEACH_QUERY` and `STEP_VERIFIED` to the production backend.
