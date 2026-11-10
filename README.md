<h1 align="center">F.R.I.E.N.D.S</h1>

<p align="center">
  <strong>Find your people. Keep them.</strong><br />
  A friendship-first community for adults: meet people through shared interests, make real friends, and do things together.
</p>

<p align="center">
  <a href="https://meet-friends-za.netlify.app"><strong>Open the live beta</strong></a>
</p>

---

## What it is

F.R.I.E.N.D.S helps adults make and keep friends. There are no follower counts and no popularity contest. You choose who you connect with, at your own pace, and the app nudges friends to actually meet.

> **Status:** early beta, shared with a small first group. Features and wording are still changing.

## Features

| Area | What you can do |
| --- | --- |
| **Profiles and trust** | Interests, "Ask me about" prompts, up to 6 gallery photos shared with friends only, and a hand-approved "Photo checked" badge |
| **Discover** | Find members by shared interests and location, with filters and compact profile tiles |
| **Friends and messages** | Friend requests, private one-to-one chat, unread counts |
| **Statuses and updates** | 24-hour statuses (with an optional photo and a song or video link) and a friends-only updates feed with private reactions |
| **Open plans** | Post a plan with limited spots, and friends join or leave. Ideas like coffee, a walk or games night |
| **Safety** | Block (hides both ways), report, community rules, South African helplines, and a privacy page |
| **Admin** | Members and plans overview, reports, photo-check review and a first-week funnel, for admins only |

## Principles

- **Friends-only by default.** Photos, statuses, updates and plans are visible to accepted friends.
- **No ads and no selling data.**
- **18 and over.**
- **No face scans.** The photo check is approved by a person and no biometric data is stored.
- **Safety is never behind a paywall.**

## Tech stack

- **Frontend:** React 19, TypeScript, Vite (hash routing, no router library)
- **Backend:** Supabase (Auth, Postgres with row-level security, private Storage buckets, security-definer functions)
- **Hosting:** Netlify (static) and the Supabase free tier
- **Planned:** an Expo mobile app (`apps/mobile`, not started)

## Project structure

```
apps/
  web/            React + Vite web app
    src/
      components/ UI pieces (status bar, feed, profile sheet, ...)
      lib/        Supabase client, types, helpers
      state/      Data hooks composed into one app context
      views/      Pages (Dashboard, Discover, Activities, Admin, ...)
  mobile/         Expo starter, not built yet
supabase/         SQL files for the database, security rules and storage
DEPLOY.md         Free hosting guide
```

## Run it yourself

You need Node.js 20 or newer and a free [Supabase](https://supabase.com) project.

1. **Clone and install**

   ```bash
   git clone https://github.com/austinprinsloo32-netizen/F.R.I.E.N.D.S-app.git
   cd F.R.I.E.N.D.S-app/apps/web
   npm install
   ```

2. **Add your Supabase keys.** Create `apps/web/.env.local`:

   ```
   VITE_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
   ```

   Use the publishable (public) key only. Never put a service-role key in the app.

3. **Set up the database.** In the Supabase SQL Editor, run the files in `supabase/` in this order:

   1. `friends_feed.sql`
   2. `safety.sql`
   3. `trust_gallery.sql`
   4. `plans.sql`
   5. `admin.sql`
   6. `status_media.sql`
   7. `admin_members.sql`

   To make yourself an admin, use the commented block at the end of `admin.sql`.

4. **Start it**

   ```bash
   npm run dev
   ```

To publish it, run `npm run build` and follow [DEPLOY.md](DEPLOY.md).

## Before using it with real people

- Set your own contact email and operator name in `apps/web/src/lib/site.ts`.
- Have the rules and privacy text reviewed by someone who knows South African data protection law (POPIA).
- Review the Supabase email settings and rate limits before a larger launch.

## Roadmap

1. **Now:** first small group, learn what makes people connect and return.
2. **Next:** stickers in chat, and a "start a call" button that shares a private voice or video link between friends.
3. **Then:** communities with named hosts, and small host-moderated support circles.
4. **Later:** mobile apps, and paid options tested only after engagement is proven.

Each step starts only when the one before it is working.

## Contributing and feedback

This is an early personal project. Feedback and bug reports are welcome through GitHub Issues.

## License

All rights reserved for now. A license will be added if the project is opened up.
