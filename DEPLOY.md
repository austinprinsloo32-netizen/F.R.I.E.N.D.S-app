# Putting F.R.I.E.N.D.S online for free

Your app is a static website that talks to Supabase, so hosting is simple. Do the steps in order.

## 0. Before anyone sees it (10 minutes)

1. Open `apps/web/src/lib/site.ts` and change **CONTACT_EMAIL** to an address you are happy to publish, and **OPERATOR_NAME** to your name or business name. These appear on the public Rules and Privacy pages.
2. Run the database files in Supabase (SQL Editor -> New query -> paste -> Run), **in this order**. Skip any you have already run:
   1. `supabase/friends_feed.sql`
   2. `supabase/safety.sql`
   3. `supabase/trust_gallery.sql`
   4. `supabase/plans.sql`
   5. `supabase/admin.sql`
3. Make yourself an admin. In `supabase/admin.sql` the last block is commented out. Copy it into a new query, replace `PUT-YOUR-LOGIN-EMAIL-HERE` with the email you log in with, remove the two leading `--` on each line, and run it. After that, an **Admin** link appears in your menu.

## 1. Build the site

In the VS Code terminal:

    cd "C:\Users\austi\Development\FRIENDS - Copy\apps\web"
    npm run build

This makes a folder called `dist` inside `apps\web`. That folder IS your website. Your Supabase keys from `.env.local` are baked into it, which is normal: the "publishable" key is meant to be public, and your data is protected by the database rules.

## 2. Host it (pick ONE)

### Option A: Netlify drag and drop (easiest, about 3 minutes, no GitHub needed)

1. Go to https://app.netlify.com and create a free account.
2. Open **Sites**, then drag the `dist` folder onto the "Drag and drop your site output folder here" box.
3. You get a link like `https://something-random.netlify.app`. You can rename it under Site configuration -> Change site name.
4. To update later: run `npm run build` again and drag the new `dist` folder onto the same site's **Deploys** page.

### Option B: Cloudflare Pages (free, commercial use allowed, deploys from GitHub)

Connect your GitHub repository, set the root directory to `apps/web`, the build command to `npm run build` and the output directory to `dist`. Add the two `VITE_SUPABASE_...` values from `.env.local` as environment variables. Every `git push` then updates the site.

Note: Vercel's free "Hobby" plan is for personal, non-commercial use, so it is a poor fit if you plan to charge money later. Check any host's current terms before you decide.

## 3. Tell Supabase about your new web address (do not skip)

Without this, the confirmation emails send people to the wrong place.

1. Supabase dashboard -> **Authentication** -> **URL Configuration**.
2. Set **Site URL** to your new link (for example `https://friends-yourname.netlify.app`).
3. Under **Redirect URLs**, add the same link, plus `http://localhost:5173` so your own testing keeps working.

## 4. Sign-up emails (important for a beta)

Supabase's built-in email sender is limited to a handful of emails per hour, so a group of new sign-ups can get stuck waiting for confirmation emails. For the first small beta either:

- turn off **Confirm email** (Authentication -> Providers -> Email), accepting that anyone with any address can sign up; or
- set up your own email service under Authentication -> SMTP Settings (several have free tiers) before you invite more than a few people.

## 5. Free-plan limits to know about

Free plans change, so check the current limits on each site. As of writing: Supabase pauses free projects that are inactive for about a week (log in and un-pause if that happens), and the free database and file storage are small but plenty for a beta of a few hundred people. Upload photos are shrunk automatically to keep storage low.

## 6. Final check before you invite people

- [ ] Open the live link in a private window on your phone and create a new account.
- [ ] The Rules and Privacy links work on the sign-in screen.
- [ ] Add a friend, post an update, host a plan and join it from a second account.
- [ ] The Admin page loads for you and not for a normal account.
- [ ] You have read the Rules and Privacy pages and agree with what they promise. They are plain-language drafts, not legal advice: get them checked (POPIA applies in South Africa) before a wider launch.
