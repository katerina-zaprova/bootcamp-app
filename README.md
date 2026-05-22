# Verity

A lightweight QA test-management app for tracking test cases, test suites, test runs, and bugs.

**Stack:** React 18 + Vite (frontend) · Express (API) · SQLite via better-sqlite3 (database)

---

## Local development

### Prerequisites

- Node.js ≥ 20
- npm ≥ 9

### Install and run

```bash
# Install all dependencies (root + server + client)
npm install

# Start both servers in watch mode (client :3000, API :3001)
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

The database (`server/data.db`) is created automatically with seed data on first run.

### Environment variables

Copy `.env.example` to `.env` and adjust as needed:

```bash
cp .env.example .env
```

---

## Project layout

```
verity/
├── client/          # React + Vite frontend
│   └── src/
│       ├── pages/   # One file per route
│       ├── components/
│       ├── context/ # PreferencesContext (theme, defaults)
│       └── hooks/
├── server/          # Express API
│   ├── routes/      # One file per resource
│   ├── db.js        # SQLite connection + schema + seed data
│   └── index.js     # App entry point
├── scripts/
│   └── batch-review.sh   # Headless Claude QA review runner
└── .github/
    └── workflows/
        └── pr-review.yml # Automated PR QA review via Claude
```

---

## DEPLOY

### Platform: Render (free tier)

Render runs a real Node.js server — no serverless cold-start issues and no
restructuring required. The free tier gives 750 hours/month with no credit
card. Services spin down after 15 minutes of inactivity; the first request
after a sleep takes ~30 seconds to wake up.

> **SQLite note:** The free tier has no persistent disk. The database resets
> on each restart, but `db.js` re-seeds demo data automatically, so the app
> is always in a working state. To persist data across restarts, upgrade to
> any paid Render tier, mount a disk at `/var/data`, and set
> `DB_PATH=/var/data/verity.db` in the service environment variables.

---

### Step 1 — Push to GitHub

Make sure the repo is on GitHub (Render pulls from there):

```bash
git add .
git commit -m "Add Render deployment config"
git push origin main
```

---

### Step 2 — Deploy on Render

Run this command in your terminal:

```bash
open https://dashboard.render.com/new/blueprint
```

In the browser tab that opens:

1. **Connect a repository** → select your `verity` repo
2. **Branch** → `main` (already selected)
3. Click **Apply**

Render reads `render.yaml`, creates the web service, builds the app
(`npm run build` → `npm start`), and gives you a public URL like
`https://verity-xxxx.onrender.com`.

That URL is your live deployment. Paste it back and we can verify everything is working.

---

### Future deploys

Every `git push origin main` triggers a new build automatically — no further manual steps needed.

---

### GitHub Actions — automated PR review

The repo includes `.github/workflows/pr-review.yml`, which posts a Claude QA
review as a comment on every pull request.

Add one secret in your GitHub repo settings
(**Settings → Secrets and variables → Actions → New repository secret**):

| Name | Value |
|---|---|
| `CLAUDE_CODE_OAUTH_TOKEN` | Your Claude Code OAuth token |
