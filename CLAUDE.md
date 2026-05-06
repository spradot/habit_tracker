# HabitTrack — CLAUDE.md

MOST IMPORTANT: DON'T EVER USE .ENV, USE .ENV.EXAMPLE

## What this project is
A mobile-first PWA (Progressive Web App) built with React + Vite + TypeScript for tracking weight loss progress.
Three core modules: calorie tracker, exercise tracker, weight tracker — all correlated on a dashboard.

## Architecture

```
src/
  types.ts          — shared TypeScript interfaces
  storage.ts        — all localStorage reads/writes (foodStore, exerciseStore, weightStore, settingsStore, foodCache)
  foodApi.ts        — Open Food Facts API wrapper + localStorage cache layer
  gemini.ts         — Gemini 2.0 Flash API call for weekly insights
  notifications.ts  — Web Notifications API wrapper
  utils.ts          — date helpers, uid(), kgToLbs()
  App.tsx           — root component, tab navigation
  pages/
    Dashboard.tsx   — weekly summary, charts, AI insight
    CaloriesPage.tsx — food search/log, macro rings
    ExercisePage.tsx — exercise log, sets/reps/PRs
    WeightPage.tsx  — weight log, trend chart, correlations
    SettingsPage.tsx — goals, units, API key, notifications
  components/
    Card.tsx        — dark rounded card container
    RingProgress.tsx — SVG calorie ring
```

## Storage model
Everything is `localStorage` — no backend, no account needed. Keys:
- `ht_food` — `FoodEntry[]`
- `ht_exercise` — `ExerciseEntry[]`
- `ht_weight` — `WeightEntry[]`
- `ht_settings` — `Settings`
- `ht_food_cache` — `Record<barcode, FoodCacheEntry>` (7-day TTL)

## External APIs (all free, no signup for basic use)
- **Open Food Facts** — `world.openfoodfacts.org` — barcode + search. No key required.
- **Gemini 2.0 Flash** — `generativelanguage.googleapis.com` — AI insights. Free key from aistudio.google.com.

## Commands
```
npm run dev      # local dev server
npm run build    # production build → dist/
npm run preview  # preview production build
```

## PWA
The app ships a service worker (via vite-plugin-pwa / Workbox) that:
- Precaches all app assets
- Caches Open Food Facts API responses (StaleWhileRevalidate, 7 days)
- Works offline after first load (all data is local)

Replace `public/icons/icon-192.png` and `public/icons/icon-512.png` with real PNGs before going to production.

## Key design decisions
- No backend = $0 hosting cost, works offline, no GDPR headaches
- Open Food Facts chosen over Nutritionix/Edamam — no API key, no rate limits
- Gemini free tier: 15 requests/minute, 1M tokens/day — enough for a single user
- All weights stored in kg internally; display unit (kg/lbs) is a setting
- PRs auto-detected: if a new set's weight exceeds all previous entries for that exercise name

## To go to production
See README.md for the full production path.
