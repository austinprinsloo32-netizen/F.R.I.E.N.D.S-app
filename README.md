# F.R.I.E.N.D.S

F.R.I.E.N.D.S is a friendship-first web app for adults to meet people through shared interests, build real friendships, and join local plans.

## What the app includes

- Account sign-up, sign-in, and password recovery
- Profiles, friend discovery, and friend requests
- A friends feed and direct messages
- Local activities and plans
- Trust, safety, and moderation tools
- Rules, privacy information, and an admin area

The web app is the main application. The `apps/mobile` folder contains an early Expo starter app and is not yet at feature parity with the web version.

## Technology

- React 19 and TypeScript
- Vite
- Supabase for authentication, database, and app data
- Expo and React Native starter for mobile

## Run the web app locally

You will need Node.js and npm installed.

1. Create `apps/web/.env.local` with your Supabase project settings:

   ```env
   VITE_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_SUPABASE_PUBLISHABLE_KEY
   ```

2. Install dependencies and start the development server:

   ```bash
   cd apps/web
   npm install
   npm run dev
   ```

3. Open the local URL printed by Vite, usually `http://localhost:5173`.

To create a production build, run this from `apps/web`:

```bash
npm run build
```

The built site is written to `apps/web/dist`.

## Supabase setup

The SQL scripts for the database are in `supabase/`. Review each script and your current Supabase schema before running it. Some scripts add tables or policies used by app features, and the required scripts depend on which features you are enabling.

Before inviting users, configure the authentication site URL and redirect URLs in Supabase for your deployed domain and local development address. Set the public operator name and support email in `apps/web/src/lib/site.ts` to values you intend to publish.

## Deploy

Deploy the contents of `apps/web/dist` to a static hosting provider. Configure the two `VITE_SUPABASE_...` environment variables in the hosting dashboard, and set the matching production URL in Supabase Authentication settings. See [DEPLOY.md](DEPLOY.md) for the project's deployment checklist.

## Project layout

```text
apps/
  web/       React and TypeScript web application
  mobile/    Expo and React Native starter
supabase/    SQL scripts for app data, policies, safety, and plans
DEPLOY.md   Deployment and launch checklist
```

## Important

Never commit private service-role keys, passwords, or other secrets. The web app uses a Supabase publishable key; access to user data must be protected by correctly configured Supabase Row Level Security policies.
