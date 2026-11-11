# F.R.I.E.N.D.S web app

The main product: a React 19 + TypeScript app built with Vite, using Supabase for sign-in, the database, file storage and row-level security.

For what the app does, screenshots and the full setup guide, see the [main README](../../README.md). To put it online, see [DEPLOY.md](../../DEPLOY.md).

## Quick start

1. Set up the database first: run the scripts in [`../../supabase`](../../supabase) in the order given in the main README, starting with `base_tables.sql`.
2. Create `apps/web/.env.local` with your Supabase project's details:

   ```env
   VITE_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_SUPABASE_PUBLISHABLE_KEY
   ```

3. Install and run:

   ```bash
   npm install
   npm run dev
   ```

   Open the address Vite prints, usually <http://localhost:5173>.

## Commands

| Command | What it does |
|---------|--------------|
| `npm run dev` | Starts the dev server with hot reload |
| `npm run build` | Type-checks and builds the site into `dist/` |
| `npm run preview` | Serves the production build locally |
| `npm run lint` | Runs ESLint |

## Source layout

```text
src/
  views/       Pages: Dashboard, Discover, Friends, Messages, Activities, Profile, Admin...
  components/  Shared UI: feed, status bar, photo gallery, safety actions...
  state/       App state and Supabase data hooks
  lib/         Supabase client, routing, site settings (site.ts), helpers
```

Before inviting people, set `OPERATOR_NAME` and `CONTACT_EMAIL` in `src/lib/site.ts`. They appear on the public Rules and Privacy pages.
