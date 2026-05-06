# HabitTrack

Weight-loss habit tracker — calories, exercise, weight — all in one mobile-first PWA.

**No account. No backend. Works offline. $0 to run.**

---

## Features

| Module | What it does |
|---|---|
| Calorie Tracker | Search Open Food Facts or log custom meals. Daily/weekly macros. |
| Exercise Tracker | Log sets, reps, weights. Auto-detects PRs. |
| Weight Tracker | Daily weight log. Trend chart. Correlates calories & exercise to weight. |
| Dashboard | Weekly summary, calorie deficit, AI-powered insights via Gemini. |
| Notifications | Alerts when you're approaching your calorie goal. |

---

## Quick start (local)

```bash
npm install
npm run dev
```

Open `http://localhost:5173` in your browser (or on your phone via your local IP).

---

## Getting a Gemini API key (free)

1. Go to [aistudio.google.com](https://aistudio.google.com)
2. Sign in with Google → "Get API key"
3. Copy the key → paste it in **Settings → Gemini AI**

Free tier: 15 requests/min, 1M tokens/day — more than enough for personal use.

---

## Using it on your Android phone right now (no app store)

### Option A — Run on your PC, access from phone (quickest)
```bash
npm run dev -- --host
```
This prints a local network URL like `http://192.168.1.x:5173`. Open that on your Android Chrome browser. Tap **menu → Add to Home Screen** for an app-like experience.

### Option B — Deploy for free (permanent URL, works anywhere)

#### Vercel (recommended, 1 command)
```bash
npm install -g vercel
npm run build
vercel deploy dist/
```
You get a `https://your-app.vercel.app` URL. Open on Android, add to Home Screen.

#### Netlify
```bash
npm run build
# Drag-drop the dist/ folder to netlify.com/drop
```

#### GitHub Pages
```bash
npm run build
# Push dist/ to gh-pages branch or configure Vite base path
```

All are free. Vercel is easiest for zero-config deploys.

---

## Going to production — best case scenario

| Concern | Current (demo) | Production upgrade |
|---|---|---|
| **Storage** | localStorage (device-only) | [Supabase free tier](https://supabase.com) — 500MB Postgres, auth, sync across devices |
| **Hosting** | Local dev | Vercel / Netlify free tier |
| **Icons** | 1px placeholder | Replace `public/icons/icon-192.png` and `icon-512.png` with real 192×192 and 512×512 PNGs |
| **Barcode scan** | Manual search | Add [html5-qrcode](https://github.com/mebjas/html5-qrcode) for camera-based barcode scanning |
| **Data backup** | None | Export to JSON (add button), or sync to Supabase |
| **Auth** | None needed (single user) | Supabase Auth if you want multi-device sync |

### Supabase migration (when ready)
1. Create a free Supabase project
2. Create tables: `food_entries`, `exercise_entries`, `weight_entries`
3. Replace `foodStore`/`exerciseStore`/`weightStore` in `src/storage.ts` with Supabase client calls
4. Keep localStorage as offline cache layer (the structure already supports this)

---

## Why this instead of Notion/Notes?

| Problem | HabitTrack solution |
|---|---|
| Notion too complex on Android | Single-screen tabs, big tap targets, no nav complexity |
| Notes can't compare dates | Every entry has a date; charts show trends over time |
| Notes has no correlation | Weight × calories × exercise charts built-in |
| No calorie counting anywhere | Open Food Facts search with 3M+ products |
| Losing historical data | LocalStorage persists; export to JSON for backups |

---

## Architecture overview

```
src/
  types.ts          → TypeScript interfaces for all data
  storage.ts        → localStorage abstraction (all reads/writes)
  foodApi.ts        → Open Food Facts + offline cache
  gemini.ts         → Gemini AI weekly insight
  notifications.ts  → Web Push Notifications
  utils.ts          → date/unit helpers
  App.tsx           → tab navigation shell
  pages/            → one file per tab
  components/       → RingProgress, Card
```

All data lives in `localStorage`. Keys are prefixed `ht_` to avoid collisions.

---

## Project files

| File | Purpose |
|---|---|
| `CLAUDE.md` | Claude Code context — architecture, commands, design decisions |
| `CHANGES.md` | Version changelog |
| `README.md` | This file |

---

## v0.1.0 — May 2026
