# FitQuest

A strength-training app that plays like a game: earn XP, level up through ranks,
keep a weekly streak (with shields to protect it), complete quests and chase PRs.
It also nudges you toward whatever you've been skipping, has an AI coach, and
lets you add friends.

**Live:** https://yadaboi.github.io/Fitquest/ (installable from the browser)

## Tech

- **App:** React 19 + TypeScript, built with Vite, styled with Tailwind CSS v4
- **Data:** Supabase (auth, Postgres, edge functions), React Query, Zustand
- **Installable:** PWA via `vite-plugin-pwa`

## Project layout

```
src/
  features/      one folder per screen (home, train, stats, profile, friends, coach, auth, onboarding)
  components/    shared UI (layout, tab bar, install prompt, celebrations)
  hooks/         data hooks (React Query + Supabase)
  lib/           app logic (gamification, quests, recommendations, goals)
  context/       auth session
shared/          logic used by both the app and the Supabase edge functions
supabase/
  migrations/    database schema, applied in order
  functions/     edge functions (complete-workout, coach-chat, send-friend-request)
```

Colors live as theme tokens in `src/index.css` (`--color-accent`, `--color-surface`, ...)
and are used as Tailwind classes such as `bg-surface`, `text-text-muted` or `border-accent`.

## Running it locally

1. `npm install`
2. Copy `.env.example` to `.env.local` and fill in your Supabase URL and anon key
3. `npm run dev`

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` | Type-check and build to `dist/` |
| `npm run lint` | Lint with oxlint |
| `npm run format` | Format the code with Prettier |

## Deploying

Pushing to `main` deploys automatically to GitHub Pages
(`.github/workflows/deploy.yml`). The Supabase URL and anon key come from the
repo's `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` Actions secrets.
