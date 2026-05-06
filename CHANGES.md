# Changelog

## [0.1.0] — 2026-05-05

### Added
- **Calorie Tracker** — log meals by searching Open Food Facts or entering custom macros; daily/weekly view; calorie + macro ring progress; date navigation
- **Exercise Tracker** — log strength/cardio/mobility; sets, reps, weight per set; automatic PR detection; expandable set detail; date navigation
- **Weight Tracker** — log daily weight (6am recommended); 30-day trend line chart; calorie→next-day-weight scatter correlation; exercise volume vs weight scatter chart
- **Dashboard** — today's summary rings, weekly calorie bar chart, calorie deficit/surplus calculation, quick-log shortcuts
- **AI Insights** — Gemini 2.0 Flash integration; weekly bullet-point coaching based on actual food/exercise/weight data
- **Push Notifications** — Web Notifications API; alerts at configurable % of daily calorie goal + on reaching limit
- **PWA** — installable on Android/iOS via "Add to Home Screen"; full offline support via Workbox service worker
- **Settings** — daily calorie + protein goals, weight unit (kg/lbs), calorie alert threshold, Gemini API key
- **Offline food cache** — Open Food Facts results cached in localStorage for 7 days; works in no-network zones

### Storage
- 100% localStorage — no backend, no account, no cost

### Tech stack
- React 19 + Vite 8 + TypeScript
- Tailwind CSS v4
- Recharts (charts)
- Lucide React (icons)
- vite-plugin-pwa + Workbox
- Open Food Facts API (free, no key)
- Google Gemini 2.0 Flash (free tier, key required)
