# Kilig

> This repo's package name is `kilig`. The GitHub repo URL itself is
> still `github.com/PrinceKeldon/flowcast` — `flowcast` was this
> project's original working name before "Kilig" was settled on as
> the actual product name; the repo slug was never renamed to match,
> which is fine (plenty of products' repo/domain infra doesn't match
> their consumer-facing name). Just don't take the URL as the brand.

Emotion-first discovery for vertical drama — "Netflix without hosting."
Users pick a feeling, not a genre; the app surfaces titles that match,
then deep-links out to wherever each one actually lives (ReelShort,
DramaBox, YouTube, TikTok, etc).

**Read [ARCHITECTURE.md](./ARCHITECTURE.md) before changing the UI or
data model** — it documents the product philosophy (why match scores
are computed the way they are, why taxonomy is hidden behind a
disclosure, why there are so few Client Components) so those decisions
don't get accidentally undone in a future edit.

## Quick start

```bash
npm install                              # triggers `prisma generate` via postinstall
cp .env.example .env                     # point DATABASE_URL at a real Postgres instance
npx prisma migrate deploy                # applies the migration in prisma/migrations/
npm run db:seed                          # loads 6 example titles + reactions
npm run dev
```

## Stack

- **Next.js 16** (App Router, Turbopack, React 19) — Server Components
  for reads, Server Actions for writes. See ARCHITECTURE.md for why this
  is a single Next.js app rather than a separate Python/FastAPI backend.
- **Prisma 7** + Postgres — schema in `prisma/schema.prisma`
- **Tailwind v4** — brand tokens (ink navy / marigold / rose) in
  `src/app/globals.css`
- **lucide-react** for icons

## Scripts

- `npm run dev` — local dev server
- `npm run build` / `npm run start` — production build/serve
- `npm run db:seed` — seed example titles (uses `prisma/seed.ts`)
- `npm run db:migrate` — `prisma migrate dev`

## Deploying (Vercel)

The app runs on **Next.js 16** + **Prisma 7** against Supabase Postgres.
Prisma 7 reads connection URLs from `prisma.config.ts`, not
`schema.prisma`, so deployment needs two env vars:

- **`DATABASE_URL`** — the runtime (app) connection. On Supabase this is
  the **transaction pooler** URL (`...pooler.supabase.com:6543/...`) —
  serverless-safe, used by the Prisma Client at runtime.
- **`DIRECT_URL`** — the **session/direct** connection (`...:5432/...`),
  used only by Prisma CLI commands like `prisma migrate deploy`. The
  migration engine needs a session connection to take advisory locks; it
  will hang or fail through a transaction pooler.

Local `.env` needs both too — `prisma.config.ts` falls back to
`DATABASE_URL` if `DIRECT_URL` isn't set, but once `DATABASE_URL` points
at a pooler you must provide `DIRECT_URL` for any `prisma migrate`
command to work.

Also set `ADMIN_PASSWORD` (admin gate) and, once a domain is registered,
`NEXT_PUBLIC_SITE_URL` (sitemap + robots).

A `prebuild` script runs `prisma migrate deploy` automatically when
`VERCEL_ENV=production`, so a production deploy applies pending
migrations before the build. Preview/staging deploys skip it (they share
the same database); run new migrations with `npx prisma migrate deploy`
locally before merging to `main`. `npm run postinstall` already runs
`prisma generate`, so no extra build step is needed.
