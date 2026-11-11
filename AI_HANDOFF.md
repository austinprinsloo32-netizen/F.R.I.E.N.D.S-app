# F.R.I.E.N.D.S project handoff

This file is the shared context for AI-assisted work on F.R.I.E.N.D.S. Read it with `README.md` before making changes.

## Product

F.R.I.E.N.D.S is a friendship-first social app for adults. It helps members discover people through shared interests, send friend requests, message, share short-lived statuses and updates, and make small activity plans. It is not a dating app.

The web app is the main product. It is a React 19 + TypeScript + Vite single-page app, hosted on Netlify, with Supabase Auth, Postgres, Storage, and row-level security. The mobile folder is an Expo starter.

## Working features

- Sign up, login, password recovery, profiles, discovery, friend requests, friends, and private messages
- 24-hour statuses, friends-only updates and reactions
- Activities, including hosting, joining, and cancelling plans
- Blocking, reporting, photo galleries, profile prompts, and admin tools
- Invite card on the Dashboard with share and copy-link actions

## In development / not live

- **Communities** has an MVP implementation in progress on the `feature/communities` branch. It uses invite-only groups, a host, member-only news/plans/member views, and moderation actions. Its SQL is a draft; it has not been run against Supabase. The feature is disabled unless `VITE_FEATURE_COMMUNITIES=true`.
- **Support** is currently a roadmap page. It is intended to involve guided listening, so define boundaries, staffing, safeguarding, and crisis handling before building a service flow.

## Technical and safety notes

- Keep database access protected by Supabase row-level security. Treat SQL files as setup/migration scripts and review them before applying them to the live Supabase project.
- The Communities SQL draft depends on `base_tables.sql`, `friends_feed.sql`, and `safety.sql`; test it only on a separate Supabase project until reviewed.
- `supabase/profile_trust.sql` is an older, conflicting gallery script. The current setup guide says to use `trust_gallery.sql` instead.
- Do not deploy the site or alter the live database as part of coding work unless Austin explicitly asks.
- Never put Supabase secrets in source files or this handoff document.
- Preserve the existing FRIENDS visual style and plain-language product copy.

## Collaboration workflow

- Use GitHub as the shared workspace between assistants; chat sessions do not communicate directly.
- Work on a separate feature branch, review the diff, and merge only after Austin approves it.
- Do not have multiple assistants edit the same branch at the same time. One can implement while the other reviews a branch or pull request.
- Keep the Communities MVP isolated on `feature/communities` until Austin reviews it. Keep Support separate until its safety and operating model are decided.

## Current local work

Recent base changes improve the Dashboard invite card, replace the Vite lightning favicon with the FRIENDS `f.` mark, and refine the Supabase schema scripts. They are on the `codex/claude-handoff` GitHub branch and have not been merged or deployed. Communities changes are being developed separately on `feature/communities`; keep the SQL as a draft and do not deploy. Check the working tree before starting and keep Austin's existing untracked files untouched.
