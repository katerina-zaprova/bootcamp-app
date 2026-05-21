# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Stack

React 18 + Vite (port 3000) frontend, Express (port 3001) backend, plain JavaScript throughout — no TypeScript, no test runner.

## Commands

```bash
npm run dev                      # start client and server together
npm run dev --prefix client      # client only
npm run dev --prefix server      # server only
npm install                      # installs root + client + server deps
npm run build --prefix client    # production build
```

## Severity Levels

| Level | Definition |
|---|---|
| **Critical** | The feature is completely broken or causes data loss. |
| **Major** | The feature fails but a workaround exists. |
| **Minor** | Behaviour is wrong or unexpected but impact is low. |
| **Trivial** | Cosmetic or negligible issue with no functional impact. |

## Test Case Fields

- **Title** — what the test covers, in plain language
- **Preconditions** — state required before the test starts (omit if none)
- **Steps** — numbered actions the tester performs
- **Expected result** — what correct behaviour looks like
- **Severity** — Critical / Major / Minor / Trivial
- **Status** — draft / ready / passed / failed / skipped

## Bug Report Fields

- **Title** — short description of what is broken
- **Steps to reproduce** — numbered, minimal, exact
- **Expected** — what should have happened
- **Actual** — what did happen
- **Severity** — Critical / Major / Minor / Trivial
- **Status** — open / in-progress / resolved / closed / reopened

## API Response Shape

Every endpoint returns:

```json
{ "success": true, "data": <any>, "error": null }
{ "success": false, "data": null, "error": "<message>" }
```

## File Naming

- Files: `kebab-case.js` / `kebab-case.jsx`
- React components: `PascalCase.jsx`
- API handler functions: `handleVerbNoun` (e.g. `handleCreateUser`)

## QA Preferences

- If a bug could be environment-specific, include the browser and OS in the title (e.g. "Login button unresponsive — Chrome 124 / macOS").

## Voice

Write test cases and bug reports in clear, direct English. State what happens and what should happen. No buzzwords, no filler, no passive voice where active works better.
