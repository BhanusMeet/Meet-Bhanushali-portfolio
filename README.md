# Meet Bhanushali: Portfolio

A security-minded developer portfolio with an interactive 3D hero, a scroll-driven cartoon avatar,
and a **private, invitation-only client review system**.

**Stack:** React 19, TypeScript, Vite, Tailwind CSS v4, Framer Motion, Three.js (React Three Fiber + Drei),
Supabase (Postgres, Auth, Edge Functions), Vercel.

## Quick start

```bash
npm install
cp .env.example .env     # optional: the site runs without any Supabase configuration
npm run dev              # http://localhost:5173
```

| Command | What it does |
| --- | --- |
| `npm run dev` | Vite dev server |
| `npm run build` | Type-check and production build to `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run typecheck` / `npm run lint` | TypeScript / ESLint |
| `npm test` | Vitest: client validation and **database security tests** (the real migration in an in-process Postgres) |
| `npm run check:build` | Audit `dist/`: asset references resolve, no secrets in the bundle |
| `npm run check` | Everything above, in order |

Add `?sample=1` to the URL **in dev only** to preview the project cards with clearly labelled placeholder data.

## Documentation

* [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md): folder layout, 3D scene, avatar, backend, database, data flow
* [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md): Supabase and Vercel setup, first admin, secrets
* [`docs/SECURITY.md`](docs/SECURITY.md): guarantees, where each is enforced, what is and isn't tested
* [`supabase/README.md`](supabase/README.md): backend and database folder

## Editing content

| What | Where |
| --- | --- |
| Name, tagline, nav, contact channels | `src/config/site.ts` (env vars override the defaults) |
| Work experience | `src/data/experience.ts` |
| Skills | `src/data/skills.ts` |
| Projects | `src/data/projects.ts` (empty by default, which shows an empty state; a template is at the top) |
| Hobbies | `src/data/hobbies.ts` |
| Certificates | `src/data/certificates.ts` |

Nothing in the repository invents roles, achievements, projects, testimonials or links. Missing
details render as "to be added" or are hidden.

> The four certificate scans in the project root are git-ignored (`/*.jpg`) because they contain
> certificate IDs. Only their text details are used on the site.

## Environment variables

Only `VITE_*` variables reach the browser. See [`.env.example`](.env.example) for the full list and
[`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) for where each one goes. The service-role key is injected into Edge
Functions by Supabase and must never be placed in `.env`, Vercel or any `VITE_*` variable.

## Status

Verified locally: type check, lint, 26 tests, production build, build audit, and browser runs of the
public site and of the review and admin screens against a throw-away mock. **Not verified** (needs a real
Supabase project): Supabase Auth sign-in, PostgREST with RLS, the Edge Functions on Deno, real CORS, true
parallel-connection concurrency, and e-mail (not implemented; invitation links are copied by hand).
