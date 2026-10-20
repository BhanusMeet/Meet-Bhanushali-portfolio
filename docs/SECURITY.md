# Security

## Guarantees and where they are enforced

| Guarantee | Enforced by |
| --- | --- |
| Anonymous users cannot read invitations, token hashes, client e-mails or admin records | No table privileges for `anon`; RLS on every table; `token_hash` column not granted to any client role |
| Public visitors cannot create or approve reviews | No INSERT/UPDATE grants; reviews are created only by `submit_review()` (service role) and moderated only by `moderate_review()` (self-checks `is_admin()`) |
| Only explicit administrators can moderate or invite | `admin_users` allow-list; RLS policies and `moderate_review()` use `is_admin()`; `admin-invitations` re-verifies the JWT and admin membership |
| Invitations are single-use, expiring, revocable | `submit_review()` locks the row (`FOR UPDATE`), checks revoked/used/expired, then inserts and consumes in one transaction; `UNIQUE(invitation_id)` is an independent backstop |
| Tokens are unguessable and not recoverable | 32 bytes from the platform CSPRNG; only SHA-256 is stored; the raw link is shown once |
| Only approved + consented reviews are public | `get_public_testimonials()` re-checks both conditions in the database and returns safe columns only |
| Clients cannot set status, timestamps, reviewer or invitation id | Not parameters of `submit_review()` |
| Service-role key never reaches the browser | Used only inside Edge Functions; no `VITE_` variant exists; `npm run check:build` scans the bundle |
| Abuse of public endpoints is limited | DB-backed fixed-window limiter per IP and per token; per-user on admin creation; fails closed |
| Logs contain no secrets | Functions log event names and error codes only |

## Other controls

* **Headers (`vercel.json`)**: CSP, HSTS, `X-Frame-Options: DENY`, `nosniff`, `Permissions-Policy`; `/review/*` gets `Referrer-Policy: no-referrer`, `no-store`, `noindex`; `/admin*` gets `no-store`, `noindex`.
* **CORS**: allow-list from `ALLOWED_ORIGINS`; other origins receive no CORS headers.
* **Output**: all user text is rendered through React; there is no `dangerouslySetInnerHTML`.
* **Links**: contact URLs must be `https://`; external links use `rel="noopener noreferrer"`.
* **Auth**: no public sign-up page; disable sign-ups in the Supabase dashboard (see DEPLOYMENT.md).

## Database changes

Never edit an applied migration. Add a new timestamped file in `supabase/migrations/`. Keep
`SECURITY DEFINER` functions on `search_path = ''` and revoke `PUBLIC` execute explicitly.

## Tests

`tests/review-db.test.ts` runs the real migration in an in-process Postgres (PGlite) with stand-ins for
Supabase roles. It checks invalid/expired/revoked/used tokens, payload validation, anonymous and
non-admin denial, token-hash protection, public visibility rules and the rate limiter.

**Not covered by automated tests** (needs a real Supabase project): Supabase Auth, PostgREST with RLS,
the Edge Functions on Deno, real CORS, and true parallel-connection concurrency.

## Reporting a vulnerability

Open a private security advisory on the GitHub repository (Security tab). Please do not file public issues for vulnerabilities.
