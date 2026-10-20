# Deployment

## 0. Current deployment

A Supabase project already exists for this site: **`meet-bhanushali-portfolio`** (ref `kmseyenfqovlicvhvahx`,
region `ap-south-1`). The schema was applied through the Supabase dashboard API as migration `review_system`
(so the remote history shows its own timestamp, not the `20261020000000` file name; the SQL is identical) and
the site-content migration (`site_content`) is applied and seeded with the starter content (`node scripts/export-seed.mjs` prints that SQL), and the three Edge Functions are deployed. If you later use the CLI against this project, run
`npx supabase migration repair --status applied 20261020000000 20261021000000` once before `db push`.

Public values for Vercel (safe to expose, protected by RLS):

```
VITE_SUPABASE_URL=https://kmseyenfqovlicvhvahx.supabase.co
VITE_SUPABASE_ANON_KEY=<the sb_publishable_... key from Project Settings -> API Keys>
```

Edge Function CORS accepts `localhost:5173` and `https://meet-bhanushali-portfolio*.vercel.app` by default; add a
custom domain with the `ALLOWED_ORIGINS` secret.

## 1. Supabase

You need a Supabase project and the [Supabase CLI](https://supabase.com/docs/guides/local-development) (`npx supabase ...` works).

```bash
npx supabase login
npx supabase link --project-ref <your-project-ref>

# schema, constraints, RLS policies, SQL functions (forward migrations only)
npx supabase db push

# Edge Function secrets (server-side only)
npx supabase secrets set \
  PUBLIC_SITE_URL=https://your-domain.com \
  ALLOWED_ORIGINS=https://your-domain.com,http://localhost:5173 \
  RATE_LIMIT_SALT=$(openssl rand -hex 32)

# JWT behaviour per function comes from supabase/config.toml
npx supabase functions deploy invitation-status submit-review admin-invitations
```

In the **Supabase dashboard**:

1. Authentication -> Sign In / Providers -> Email: turn **off** "Allow new users to sign up".
   (`config.toml` only applies to local development; hosted projects are set in the dashboard.)
2. Project Settings -> API: copy the **Project URL** and the **anon / publishable key**.

### First administrator

1. Authentication -> Users -> Add user (strong unique password, auto-confirm; enable MFA if available).
2. Run [`supabase/provision-first-admin.sql`](../supabase/provision-first-admin.sql) in the SQL editor after
   replacing the e-mail. This inserts the user into `public.admin_users`.
3. Sign in at `/admin/login`.

Being a Supabase user is not enough: only users listed in `admin_users` can do anything. Delete the row to revoke.

## 2. Vercel

1. Push to GitHub and import the repo in Vercel (framework: Vite; `vercel.json` provides SPA rewrites and security headers).
2. Add Environment Variables (Production and Preview): `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.
   Contact channels default to the values in `src/config/site.ts`; set `VITE_CONTACT_EMAIL`,
   `VITE_INSTAGRAM_URL`, `VITE_LINKEDIN_URL`, `VITE_FIVERR_URL` only to override them.
3. **Never** add the service-role key to Vercel or to any `VITE_*` variable.
4. After the first deploy, set the Supabase secrets `PUBLIC_SITE_URL` / `ALLOWED_ORIGINS` to the final domain,
   replace `example.com` in `public/robots.txt` and `public/sitemap.xml`, and optionally add `og:image` / `og:url` to `index.html`.

## 3. Before every release

```bash
npm run check     # typecheck, lint, tests, production build, build audit
```

`check:build` (`scripts/audit-build.mjs`) verifies that every asset referenced by the built HTML/CSS/JS
exists and that no secret-shaped strings or server-only variable names reached the browser bundle.

## 4. Local development

```bash
npm install
cp .env.example .env     # optional: the site runs without any Supabase configuration
npm run dev
```

Without Supabase configured, the portfolio works fully; `/admin` and `/review/:token` show a clear
"not configured" state and the testimonials section shows its empty state.

## 5. Secrets

* Real values live only in Vercel's env settings, Supabase secrets and a password manager.
* `.env*` is git-ignored except `.env.example`, which contains placeholders only.
* If a secret leaks: rotate it in Supabase (Project Settings -> API), redeploy, and update Vercel.
  `RATE_LIMIT_SALT` can be rotated freely (it only resets rate-limit buckets).
