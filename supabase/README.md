# Backend and database

This folder is both the backend and the database, because the Supabase CLI requires this layout.

| Path | Role |
| --- | --- |
| `functions/` | Edge Functions (Deno): `invitation-status`, `submit-review`, `admin-invitations`; shared helpers in `functions/_shared/` |
| `migrations/` | Postgres schema, RLS policies and SQL functions. Forward-only: add new files, never edit applied ones |
| `provision-first-admin.sql` | One-off script to make your Supabase user an administrator |
| `config.toml` | CLI config: sign-ups off locally, JWT verification per function |

Edge Functions cannot import from `src/`. See `docs/ARCHITECTURE.md` for how validation is mirrored
across the client, the functions and SQL, `docs/SECURITY.md` for the guarantees, and
`docs/DEPLOYMENT.md` for the setup commands.
