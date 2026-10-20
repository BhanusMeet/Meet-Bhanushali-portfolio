# Architecture

The project is one repository with three clearly separated areas. The root layout is kept flat on
purpose: Vite, Vercel and the Supabase CLI all expect their config at the root (`index.html`,
`vercel.json`, `supabase/`), and moving them into `frontend/` / `backend/` folders would add
tooling for no benefit.

| Area | Where | Runs on |
| --- | --- | --- |
| **Frontend** | `src/`, `public/`, `index.html`, `vite.config.ts` | Browser (static build on Vercel) |
| **Backend** | `supabase/functions/` (Deno Edge Functions) | Supabase |
| **Database** | `supabase/migrations/`, `supabase/provision-first-admin.sql` | Supabase Postgres |
| **Tests / tooling** | `tests/`, `scripts/` | Local / CI |

## Frontend (`src/`)

```
src/
├── main.tsx, App.tsx          entry point and routes (admin + review pages are lazy-loaded)
├── pages/                     route-level screens: Home, ReviewPage, admin/*
├── components/
│   ├── layout/                Navbar, Footer, Wordmark
│   ├── sections/              Hero, About, Experience, Skills, Projects, Hobbies, Testimonials, Contact
│   ├── avatar/                the cartoon avatar and its scroll behaviours (see below)
│   ├── admin/                 admin shell and small admin-only pieces
│   └── ui/                    shared primitives: Button, SectionHeading, icons, StatusDot/Tag/Spinner
├── 3d/                        everything Three.js / React Three Fiber
├── animations/                scroll-linked Reveal
├── hooks/                     reusable hooks
├── lib/                       Supabase client, API calls, validation, small utilities
├── data/                      editable content (experience, skills, projects, hobbies, certificates)
├── config/site.ts             name, nav, contact channels
├── types/                     shared TypeScript types
└── index.css                  Tailwind v4 design tokens (`@theme`) and base/component styles
```

Content lives in `src/data/` and `src/config/`, so text and links change without touching components.

### 3D (`src/3d/`)

```
3d/
├── HeroVisual.tsx             loader/wrapper: lazy import, WebGL detection, pause off-screen, reduced motion
├── SceneFallback.tsx          SVG shown while loading or when WebGL is unavailable
├── scenes/HeroScene.tsx       <Canvas>, camera, lights, procedural <Environment>
├── objects/Core.tsx           faceted metal core + wireframe shell, pointer and scroll response
├── objects/OrbitRing.tsx      ring with a travelling satellite
└── materials/colors.ts        shared accent colour
```

There are **no custom shaders, textures, or model files**: materials are standard/physical Three.js
materials, and reflections come from a procedural `Lightformer` environment, so nothing is downloaded
for the scene. `HeroScene` is the only chunk that imports `three`, `@react-three/fiber` and
`@react-three/drei`; it is loaded with a dynamic import after first paint.

Rendering rules worth knowing:

* `frameloop` is `never` while the canvas is off-screen or the tab is hidden, `always` normally, and
  `demand` (a single static frame) under `prefers-reduced-motion`.
* High-frequency values (pointer, scroll progress) are read inside `useFrame` from refs and
  `window.scrollY`; nothing in the animation loop calls `setState`.
* `lowPower` (narrow screens or few CPU cores) drops one ring, lowers geometry detail and device pixel ratio.

### Avatar (`src/components/avatar/`)

A hand-drawn SVG character with layered parts.

* `Avatar.tsx`: the drawing, pointer parallax, scroll-driven step cycle, moods, running/hanging/rubbing poses.
* `AvatarFollower.tsx`: shrinks and parks in the corner as you scroll; detects very fast scrolling.
* `AvatarStunt.tsx`: face-plant on links to `#work` / `#contact` and on a very fast scroll down.
* `AvatarRope.tsx`: the "Back to top" cable-and-winch haul (links marked `data-rope`).
* `avatarBus.ts`: one shared "busy" flag so stunts never overlap. `layout.ts`: shared corner geometry.

All of it is skipped under `prefers-reduced-motion`. `hooks/useScrollSpeedLimit.ts` caps mouse-wheel speed.

## Backend (`supabase/functions/`)

| Function | Auth | Purpose |
| --- | --- | --- |
| `invitation-status` | none (token + rate limit) | Is this invitation usable? Returns only the client name and project |
| `submit-review` | none (token + rate limit) | Validates and calls `submit_review()` |
| `admin-invitations` | admin JWT, re-checked against `admin_users` | Create (returns raw token once) or revoke invitations |
| `_shared/http.ts` | n/a | CORS, JSON helpers, SHA-256, token generation, rate-limit wrapper |

Edge Functions run on Deno and cannot import from `src/`, so the review validation rules exist in
three deliberate places that must stay in step: `src/lib/validation.ts` (UX), the Edge Function
(`cleanText` plus type checks) and the SQL function `submit_review` / table `CHECK`s (the authority).

## Database (`supabase/migrations/`)

One forward migration, `20261020000000_review_system.sql`, creates `admin_users`, `review_invitations`,
`testimonials`, `rate_limits`, all RLS policies, privileges, and the SQL functions
(`is_admin`, `get_public_testimonials`, `get_invitation_status`, `submit_review`, `moderate_review`,
`check_rate_limit`). Schema changes after this must be **new migration files**, never edits to this one.

## Data flow: a client review

1. Admin signs in (Supabase Auth, must be in `admin_users`) and calls `admin-invitations`.
2. The function stores `sha256(token)` and returns the raw link once.
3. Client opens `/review/<token>` -> `invitation-status` -> form -> `submit-review` -> `submit_review()`
   inserts a **pending** review and consumes the invitation in one transaction.
4. Admin approves in the dashboard (`moderate_review()`); the public section reads
   `get_public_testimonials()`, which returns only approved + consented rows.
