# Putting F.R.I.E.N.D.S online for free

Your app is a static website that talks to Supabase, so hosting is simple. Do the steps in order.

## 0. Before anyone sees it (10 minutes)

1. Open `apps/web/src/lib/site.ts` and change **CONTACT_EMAIL** to an address you are happy to publish, and **OPERATOR_NAME** to your name or business name. These appear on the public Rules and Privacy pages.
2. Run the database files in Supabase (SQL Editor -> New query -> paste -> Run), **in this order**. Skip any you have already run:
   1. `supabase/base_tables.sql` (profiles, friend requests, chats, messages and the profile-picture bucket)
   2. `supabase/friends_feed.sql`
   3. `supabase/safety.sql`
   4. `supabase/trust_gallery.sql`
   5. `supabase/plans.sql`
   6. `supabase/admin.sql`
   7. `supabase/admin_members.sql`
   8. `supabase/status_media.sql`
   9. `supabase/communities.sql` if you are enabling Communities. Test this script on a separate Supabase project first, and confirm the live project is selected before you run it.
   10. `supabase/community_reports.sql` if Communities is enabled. It adds the Report button for posts and plans and shows them in Admin. Run it after `communities.sql`.

   Communities has no in-app group-creation screen yet. After applying its SQL, use the example at the bottom of `communities.sql` to create the first group and assign its host. Choose a real group name and share its invite code only with people you intend to invite.

   Optional: `supabase/status_expiry_optional.sql` makes the database enforce the 24-hour status expiry. Do **not** run `supabase/profile_trust.sql`: it is an older version of the gallery that the app no longer uses and it clashes with `trust_gallery.sql`.
3. Make yourself an admin. In `supabase/admin.sql` the last block is commented out. Copy it into a new query, replace `PUT-YOUR-LOGIN-EMAIL-HERE` with the email you log in with, remove the two leading `--` on each line, and run it. After that, an **Admin** link appears in your menu.

## 1. Build the site

In the VS Code terminal:

    cd "C:\Users\austi\Development\FRIENDS - Copy\apps\web"
    npm run build

To include Communities in a Netlify Drop build, add `VITE_FEATURE_COMMUNITIES=true` to `apps/web/.env.production.local` before building. Keep `apps/web/.env.local` set to the **live** Supabase Project URL and publishable key. Do not use `.env.communities.local`, which is for the test project. Remove the feature switch from the production build environment if you need to hide Communities again.

This makes a folder called `dist` inside `apps\web`. That folder IS your website. Your Supabase keys from `.env.local` are baked into it, which is normal: the "publishable" key is meant to be public, and your data is protected by the database rules.

## 2. Host it (pick ONE)

### Option A: Netlify drag and drop (easiest, about 3 minutes, no GitHub needed)

1. Go to https://app.netlify.com and create a free account.
2. Open **Sites**, then drag the `dist` folder onto the "Drag and drop your site output folder here" box.
3. You get a link like `https://something-random.netlify.app`. You can rename it under Site configuration -> Change site name.
4. To update later: run `npm run build` again and drag the new `dist` folder onto the same site's **Deploys** page.

#### Optional: update automatically on every `git push`

In Netlify open your site -> **Project configuration -> Build & deploy -> Continuous deployment -> Link repository**, pick GitHub, install the Netlify GitHub App for this repository if asked, and choose the repository. Then set **Base directory** `apps/web`, **Build command** `npm run build`, **Publish directory** `dist` (the `netlify.toml` in `apps/web` already says this), and **Production branch** to the branch you deploy from. Add `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` and, if wanted, `VITE_FEATURE_COMMUNITIES=true` under **Environment variables**. Afterwards a push to that branch deploys the site; other branches get preview links.

### Option B: Cloudflare Pages (free, commercial use allowed, deploys from GitHub)

Connect your GitHub repository, set the root directory to `apps/web`, the build command to `npm run build` and the output directory to `dist`. Add the two `VITE_SUPABASE_...` values from `.env.local` as environment variables. Every `git push` then updates the site.

Note: Vercel's free "Hobby" plan is for personal, non-commercial use, so it is a poor fit if you plan to charge money later. Check any host's current terms before you decide.

## 3. Tell Supabase about your new web address (do not skip)

Without this, the confirmation emails send people to the wrong place.

1. Supabase dashboard -> **Authentication** -> **URL Configuration**.
2. Set **Site URL** to your new link (for example `https://friends-yourname.netlify.app`).
3. Under **Redirect URLs**, add the same link, plus `http://localhost:5173` so your own testing keeps working.

## 4. Sign-up emails (important for a beta)

Supabase's built-in email sender is limited to two emails per hour per project. Keep **Confirm email** turned on for the live project and configure custom SMTP under Authentication -> Emails -> SMTP Settings before inviting a group of new users. Turning off confirmation is only appropriate for an isolated test project because it accepts unverified email addresses.

## 5. Free-plan limits to know about

Free plans change, so check the current limits on each site. As of writing: Supabase pauses free projects that are inactive for about a week (log in and un-pause if that happens), and the free database and file storage are small but plenty for a beta of a few hundred people. Upload photos are shrunk automatically to keep storage low.

## 6. Final check before you invite people

- [ ] Open the live link in a private window on your phone and create a new account.
- [ ] The Rules and Privacy links work on the sign-in screen.
- [ ] Add a friend, post an update, host a plan and join it from a second account.
- [ ] If Communities is enabled, join a community with a second account and confirm members can only post news as the host.
- [ ] The Admin page loads for you and not for a normal account.
- [ ] You have read the Rules and Privacy pages and agree with what they promise. They are plain-language drafts, not legal advice: get them checked (POPIA applies in South Africa) before a wider launch.
