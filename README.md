# MY AGENT — Personal AI Operating System (PWA)

A private, local-first personal AI agent Progressive Web App (PWA) designed primarily for iPhone and desktop. Built with **React 19**, **TypeScript**, **Vite**, **Tailwind CSS v4**, **IndexedDB (idb)**, **Approval Engine**, and the official **Google Gen AI SDK (`@google/genai`)**.

---

## 🏛️ Architecture Overview

```text
┌────────────────────────────────────────────────────────────────────────┐
│                   MY AGENT PWA (iPhone Safari / Desktop)               │
├────────────────────────────────────────────────────────────────────────┤
│ • Local-First UI: Dashboard, Chat, Memory, Approvals, Activity, Config │
│ • Web Speech Voice Dictation (Microphone API)                          │
│ • Service Worker Offline Shell (vite-plugin-pwa)                       │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
               ┌────────────────────┴────────────────────┐
               │                                         │
               ▼                                         ▼
 ┌───────────────────────────┐             ┌───────────────────────────┐
 │   LOCAL-FIRST STORAGE     │             │    APPROVAL ENGINE        │
 │       (IndexedDB)         │             │  (Independent Gatekeeper) │
 ├───────────────────────────┤             ├───────────────────────────┤
 │ • conversations           │             │ 1. Tool proposed by AI    │
 │ • messages                │             │ 2. Schema validated       │
 │ • memories (CRUD)         │             │ 3. User reviews & signs   │
 │ • approvals               │             │ 4. Revalidation on run    │
 │ • auditLogs               │             │ 5. Audit logged           │
 │ • settings                │             └───────────────────────────┘
 └───────────────────────────┘                           │
               │                                         │
               └────────────────────┬────────────────────┘
                                    │ Minimal Context Only
                                    ▼
 ┌───────────────────────────────────────────────────────────────────────┐
 │                  SERVERLESS BACKEND (/api/chat & /api/health)         │
 ├───────────────────────────────────────────────────────────────────────┤
 │ • Express (Dev) / Vercel Serverless Functions (Production)            │
 │ • Rate Limiting (In-memory sliding window)                            │
 │ • Input sanitization (max 12,000 characters)                          │
 │ • Optional AGENT_ACCESS_TOKEN Bearer authentication                   │
 └──────────────────────────────────┬────────────────────────────────────┘
                                    │ GEMINI_API_KEY (Server-Side Only)
                                    ▼
 ┌───────────────────────────────────────────────────────────────────────┐
 │                 GOOGLE GEMINI API (@google/genai)                     │
 │ • Model: gemini-3.8-flash                                             │
 └───────────────────────────────────────────────────────────────────────┘
```

---

## 🔒 Security & Privacy Guarantees

1. **Server-Side API Key**: The Gemini API key is stored exclusively in server environment variables (`GEMINI_API_KEY`). It is never bundled into or accessible by client-side code.
2. **Local-First Data Ownership**: Conversations, memories, and audit logs live exclusively in your device's browser **IndexedDB** (`my-agent-os-db`).
3. **Approval Engine**: Gemini cannot unilaterally execute actions. Every proposed modification, deletion, or external network action generates a pending `ApprovalRequest` that requires explicit user confirmation.
4. **Data Portability**: Full JSON backup export and restore mechanisms are built into the Settings panel.
5. **No Telemetry / No Cloud Tracking**: Zero third-party analytics, external trackers, or silent telemetry.

---

## 🚀 Quick Start (Local Development)

### 1. Prerequisites
- Node.js 20+ installed
- A Google Gemini API key from [Google AI Studio](https://aistudio.google.com/apikey)

### 2. Installation
```bash
git clone https://github.com/YOUR_GITHUB_USERNAME/my-agent.git
cd my-agent
npm install
```

### 3. Environment Setup
Create `.env.local` in the project root:
```env
GEMINI_API_KEY="your_gemini_api_key_here"
GEMINI_MODEL="gemini-3.8-flash"
AGENT_ACCESS_TOKEN=""
```

### 4. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📱 iPhone PWA Installation (Safari)

1. Open your deployed URL (e.g. `https://my-agent.vercel.app`) in **Safari** on iPhone.
2. Tap the **Share** button in the Safari toolbar.
3. Scroll down and tap **Add to Home Screen**.
4. Tap **Add** in the top right.
5. Launch **MY AGENT** from your home screen as a standalone application.

---

## 🚢 Deploying to GitHub & Vercel

### Step 1: Create a Private GitHub Repository
1. Go to [GitHub](https://github.com/new) and create a repository named `my-agent` with visibility set to **Private**.
2. Run these commands in your local project terminal:
```bash
git init
git add .
git commit -m "feat: complete Phase 1 foundation for MY AGENT PWA"
git branch -M main
git remote add origin https://github.com/YOUR_GITHUB_USERNAME/my-agent.git
git push -u origin main
```

### Step 2: Deploy on Vercel
1. Log in to [Vercel](https://vercel.com/new) and click **Add New Project**.
2. Import your private `my-agent` repository.
3. Configure the build settings:
   - **Framework Preset**: Vite
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. In **Project Settings → Environment Variables**, add:
   | Variable | Value | Notes |
   |---|---|---|
   | `GEMINI_API_KEY` | `AIzaSy...` | Your secret API key from Google AI Studio |
   | `GEMINI_MODEL` | `gemini-3.8-flash` | Configurable model identifier |
   | `AGENT_ACCESS_TOKEN` | *(optional)* | Secret token to secure `/api/chat` |
5. Click **Deploy**.

---

## 🧪 Implemented Phase 1 Features

- [x] **PWA Foundation**: Offline app shell caching, Web App Manifest, 192px/512px icons, standalone mode.
- [x] **AI Chat Interface**: Modern mobile-first chat with streaming-ready design, error handling, and history.
- [x] **Voice Input**: Speech-to-text dictation using the Web Speech API.
- [x] **IndexedDB Local-First Database**: 7 object stores (`conversations`, `messages`, `memories`, `approvals`, `auditLogs`, `settings`, `filesMetadata`).
- [x] **Approval Engine**: Full lifecycle (`PROPOSED` → `VALIDATED` → `PENDING_APPROVAL` → `APPROVED` → `EXECUTED` → `LOGGED`).
- [x] **Tool Registry**: Registered demo tools with schema validation (`get_current_app_status`, `search_local_memories`, `create_demo_note`, `delete_demo_note`, `propose_demo_action`, `simulate_external_sync`).
- [x] **Local Memory Core**: CRUD interface for personal facts, preferences, goals, and projects.
- [x] **Audit Trail**: Chronological activity and security event log with status filters.
- [x] **Backup & Recovery**: 1-click JSON export and restore for all local data.
- [x] **Dual Runtime Server**: Express with Vite middlewares for dev on port 3000, and native Vercel serverless functions in `/api`.

---

## 🔮 Future Roadmap (Phase 2 & Beyond)

- **Phase 2**: Web Crypto envelope encryption for IndexedDB stores using a user-derived master passphrase.
- **Phase 3**: Sandboxed photo attachment metadata scanner and duplicate detector.
- **Phase 4**: Scheduled background sync and notification reminders.
