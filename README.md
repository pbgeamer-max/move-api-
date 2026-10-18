# TVORA — Cinematic Streaming Platform

**TVORA** is a production-quality streaming experience for movies, TV series, and live football — a dark-cinema interface with a fully bilingual (Arabic RTL default / English LTR) UI, an original 3D-style brand identity, and honest demo data clearly labeled throughout.

![TVORA](public/images/hero-horizon.jpg)

## What's inside

- **Cinematic intro** — light beam → metallic particles → original TVORA mark → wordmark reveal (skippable, session-only, reduced-motion aware).
- **Immersive home** — rotating hero (featured movie / series / upcoming match), rows for Trending, New Releases, Arabic Picks, Continue Watching, Top Rated, Live & Upcoming matches.
- **Movies & Series** — discovery with genre chips, year/sort filters, in-results search, load-more, plus full detail pages (cast, director, trailer slot, related titles, seasons & episodes with prev/next navigation).
- **Live football** — stadium-at-night live view with auto-refreshing scoreboard cards, schedule with day tabs + date picker + competition filters + team search, match details with event timeline, and a professional watch page (HTML5/HLS-ready player with resume, keyboard controls, live mode, retry).
- **Universal search** — ⌘K overlay with keyboard navigation, recents, debounced + cancellable queries across titles, teams, competitions and fixtures.
- **My List & Continue Watching** — synced for signed-in users, local device persistence for guests.
- **Accounts** — email/password auth (scrypt-hashed, HTTP-only session cookies), profile preferences, admin role.
- **Admin panel** (`#/admin`) — overview stats, content management (flags, metadata editor), fixtures/competitions management, provider status. Server-enforced authorization.
- **Original brand** — geometric T/play-beam logo, metallic typography, film grain + vignette systems.

## Tech stack

Next.js 16 (App Router) · TypeScript · Tailwind CSS 4 · shadcn/ui · Prisma + SQLite · framer-motion · zustand · zod · HLS-ready HTML5 player.

> **Note on Firebase:** the original brief specified Firebase. This build ships with an equivalent server layer (Next.js API routes + Prisma/SQLite) so it runs with zero external credentials; the data layer is isolated (`src/lib/db.ts`, `src/app/api/*`) so a Firestore adapter can replace it without touching the UI. See "Production integration" below.

## Getting started

```bash
bun install
cp .env.example .env          # adjust DATABASE_URL if needed
bun run db:push               # create tables
bunx tsx scripts/seed.ts      # seed demo catalog (movies, series, fixtures, users)
bun run dev                   # http://localhost:3000
```

### Demo accounts

| Role  | Email             | Password          |
| ----- | ----------------- | ----------------- |
| Admin | admin@tvora.tv    | tvora-admin-2025  |
| User  | demo@tvora.tv     | demo1234          |

## Demo mode & data honesty

All titles, series, episodes, teams, competitions and fixtures are **original sample data** created for this build, clearly labeled with "بيانات تجريبية / Demo data" tags. The platform never fabricates live status, scores, reviews or analytics:

- No football or metadata API is configured → provider status shows "Not configured — demo mode" in the admin panel.
- Titles without an authorized playback source show their metadata plus an honest message instead of a fake play button.
- Watch progress is only recorded from the actual player.

## Production integration (when you have credentials)

1. **Metadata provider (e.g. TMDB)** — implement a server-side adapter in `src/lib/` that maps provider payloads to the `Title` model; keep the key in `.env` (server-only).
2. **Football data provider** — replace the fixture seeding with scheduled sync (`/api/admin/fixtures` already exposes patch endpoints; prefer provider sync over manual score entry).
3. **Authorized playback** — set `playbackType`/`playbackUrl` per title/fixture to streams you are licensed to distribute (HLS `.m3u8` is auto-detected by the player and loaded via hls.js when installed).
4. **Firestore migration** — swap `src/lib/db.ts` and the route handlers' Prisma calls for Firestore queries; DTO shapes in `src/lib/types.ts` stay identical.
5. **Deploy** — `bun run build && bun run start` (or deploy to Vercel with `DATABASE_URL` pointed at a hosted SQLite/Postgres-compatible Prisma datasource).

## Scripts

| Command | Purpose |
| --- | --- |
| `bun run dev` | Development server (port 3000) |
| `bun run lint` | ESLint |
| `bun run db:push` | Push Prisma schema |
| `bunx tsx scripts/seed.ts` | Seed demo data |
| `bash scripts/gen-assets.sh` | Regenerate artwork + demo streams |

## Routes (hash-routed SPA views)

`#/` home · `#/movies` · `#/series` · `#/title/<id>` · `#/live` · `#/matches` · `#/match/<id>` · `#/watch/<id>?ep=` · `#/mylist` · `#/continue` · `#/search` (⌘K overlay) · `#/auth/login|register|forgot` · `#/profile` · `#/pricing` · `#/about` · `#/privacy` · `#/terms` · `#/admin`

## Security notes

- Passwords: scrypt with per-user salt; never stored or logged in plaintext.
- Sessions: random 256-bit tokens in HTTP-only cookies.
- Admin routes verify role server-side on every request.
- No secrets in client code; add provider keys via `.env` only.
