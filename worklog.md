# TVORA Build Worklog

Project: TVORA — cinematic streaming platform (movies, series, live football).
Stack: Next.js 16 App Router (single visible route `/`), TypeScript, Tailwind 4, shadcn/ui, Prisma+SQLite, framer-motion, zustand.
NOTE: sandbox constraint → ALL pages are client-side hash-routed views inside `/`. API routes under /api/* are allowed and implemented.

Master prompt: /home/z/my-project/upload/Pasted Content_1791724540151.txt

---
Task ID: 1 (foundation — COMPLETE)
Agent: main (orchestrator)
Task: Architecture, contracts, data layer, design system, app shell, API routes.

Work Log:
- Read master prompt; chose stack adaptation: Prisma+SQLite instead of Firebase (no credentials in sandbox; Firebase migration documented in README), local demo data clearly labeled per prompt section 13.
- Wrote prisma/schema.prisma (User, Session, Title, Season, Episode, Competition, Team, Fixture, UserList, WatchProgress, SiteSetting) and pushed to db.
- Seeded rich bilingual demo catalog: 14 movies + 10 series (with seasons/episodes), 8 competitions, 24 teams, 17 fixtures (2 live, upcoming today/tomorrow/+2/+3, finished yesterday/-2d, 1 postponed) with events. Admin: admin@tvora.tv / tvora-admin-2025 ; user: demo@tvora.tv / demo1234. SiteSettings incl. demoMode.
- Asset pipeline: scripts/gen-assets.sh generating 11 AI images (hero backdrops + posters, no-text prompts) into public/images + 2 ffmpeg demo streams (public/media/demo-film.mp4, demo-match.mp4). Runs in background; missing images fall back to procedural SVG artwork (src/lib/artwork.ts).
- Design system: globals.css (TVORA dark-cinema tokens: ink #070708, surface #101012, elevated #171719, ice #9fb7cb, ice-strong #cfe0ee, live #e5484d, champagne #d8c9a3, hairline rgba(255,255,255,.09); tv-grain, tv-vignette, tv-metal-text, tv-shimmer utilities; reduced-motion guard).
- Fonts via next/font/google: IBM Plex Sans Arabic + Manrope (--font-tvora-sans/-display). layout.tsx metadata + OG + icon.svg favicon (original TVORA mark).
- Core libs: types.ts (DTOs+GENRES_AR), i18n.ts (full ar/en dict, ar default RTL), store.ts (zustand + hash router: #/movies, #/title/<id>, #/watch/<id>?ep=, #/auth/<mode>, #/admin?tab=…; lang persistence; guest device id), api.ts (typed fetch client w/ X-Device-Id), motion.ts (easings/variants), artwork.ts (procedural posters/badges), auth.ts (scrypt+sessions+requireAdmin+getActor), serialize.ts, cache.ts (TTL memory cache).
- API routes: /api/home, /api/titles(+[id]), /api/fixtures(+[id]), /api/search, /api/auth/{register,login,logout,me,forgot,profile}, /api/list, /api/progress, /api/admin/{overview,titles(+[id]),fixtures(+[id]),competitions(+[id]),settings}. Admin routes server-guarded.
- Shell: app-shell.tsx (hash router binding, session bootstrap, AnimatePresence view switch), intro.tsx (cinematic skippable intro: beam→particles→mark→sweep→wordmark, session-only, reduced-motion aware), nav.tsx (floating blur nav, active underline, mobile menu), footer.tsx (sticky via mt-auto), shared.tsx (useT, Reveal, Poster, Rating, TypeBadge, DemoTag, LiveDot, TitleCard, Row, SectionHeader, skeletons, EmptyState, ErrorState, useMyList, TeamBadge, FixtureCard), search-overlay.tsx, stub views for all 17 views.
- Lint clean (`bun run lint`). Dev server serving 200. Verified /api/home, /api/titles, /api/fixtures respond correctly.

Contracts for subagents:
- Views live in src/components/tvora/views/*.tsx; exports must keep: home-view(HOME), discovery-view(MoviesView,SeriesView), title-details-view(TitleDetailsView), live-view(LiveView), matches-view(MatchesView), match-details-view(MatchDetailsView), watch-view(WatchView, TvoraPlayer), library-views(MyListView,ContinueView), auth-view(AuthView), profile-view(ProfileView), static-views(PricingView,AboutView,PrivacyView,TermsView), admin-view(AdminView), notfound-view(NotFoundView).
- Non-home views include their own top padding pt-24 md:pt-28. Home is full-bleed behind transparent nav.
- Lint rule: no synchronous setState directly inside effect bodies (React 19 rule) — put setState in async callbacks or derive state.

Stage Summary:
- Full working foundation + working basic views; agents 2-a..2-d elevate the four view groups in parallel.

---
Task ID: 1b (assets — IN PROGRESS, background)
Agent: main (orchestrator)
- scripts/gen-assets.sh running: AI images → public/images/, ffmpeg demo streams → public/media/. Missing images fall back to procedural artwork automatically.

---
Task ID: 2-c
Agent: frontend-styling-expert
Task: Search/library/auth/profile/static/404 experiences — universal search overlay, My List, Continue Watching, auth suite, profile hub, static pages, cinematic 404.

Work Log:
- search-overlay.tsx: full rewrite — full-screen cinematic overlay (black/85 + backdrop-blur-xl, top-aligned max-w-2xl/3xl panel, slide+fade). Cmd/Ctrl+K global toggle + Escape close (window keydown registered on mount), ⌘K/Ctrl-K footer chip. 250ms debounced live search with AbortController (raw fetch + X-Device-Id since api.search doesn't take a signal) + shimmer loading rows. Sections Titles/Teams/Competitions/Matches with icons, poster thumbs via posterFor fallback (SmartImage), procedural team badges, live fixtures → watch view. Full keyboard nav: flattened entry list, ArrowUp/Down wraps, Enter opens, active highlight + CornerDownLeft glyph, listbox/option roles with aria-activedescendant + combobox input, mouse hover syncs active. Recent searches (tvora.recent, max 6, deduped case-insensitive, shown when empty+focused, click fills, clear-all, saved on result activation). Basic Tab focus trap in panel, focus restore to opener, body scroll lock with prior-overflow restore, backdrop click closes, X = clear/close dual action.
- smart-image.tsx (new helper): raw <img> with procedural fallback chain (primary → fallback → gradient span), lint-safe failure state keyed to src; used for all remote imagery in my views so background asset generation never shows broken art.
- library-views.tsx: MyListView — filter chips All/Movies/Series with count badges, responsive auto-fill poster grid (same visual language as TitleCard), remove (X: hover on desktop, always on touch) with optimistic hide + store setListIds sync + undo toast (restores item + api.listAdd) + revert+error toast on failure, skeleton grid, empty CTA → movies. ContinueView — cinematic 16:9 cards (backdrop → poster → procedural fallback), hover play overlay, progress bar, "Resume · NN%", SxxExx badge + episode title, remove via fetch DELETE /api/progress?titleId= with X-Device-Id (optimistic + revert), empty CTA → home, click → watch view with ep.
- auth-view.tsx: premium split layout — desktop art panel (hero-sands.jpg over procedural backdrop, gradient+vignette, mark + metal wordmark + tagline + original quote), mobile brand row; keyed <AuthForm> per mode for clean state. Login: labeled fields, show/hide password toggle, inline validation (required/email format/min length) with aria-invalid, API error mapping (invalid/email_taken/weak_password/invalid_email), spinner submit, demo-credentials card with one-click Fill (demo + admin), links. Register: name optional, strength meter (3-segment weak/good/strong, locally computed), mismatch check, success → list union-sync (server + local) → home. Forgot: honest resetSent confirmation state. Return path: sessionStorage tvora.returnView (validated whitelist) else home.
- profile-view.tsx: guest CTA card (mark + sign in / create account + guest note); signed-in identity card (avatar initial, name/email, plan crown chip), plan card + demoDataNote + link to pricing, activity card (list count from store + watch count from api.progressGet, both clickable), name edit (defaultValue + key={user.id} pattern kept per lint guidance), language toggle ar/en syncing api.updateProfile + setLang + saved toast, admin console card when role=admin, sign out (api.logout, clears user+listIds, toast, home). memberSince omitted (SessionUser has no createdAt — per contract).
- static-views.tsx: Pricing — 3 tiers (Free white/border, Premium champagne-highlighted with current-plan badge when user.plan matches, Family), Check feature lists, honest pending-configuration badges, no-fake-checkout note with ShieldCheck. About — 3 brand paragraphs (staggered Reveal), logo showcase (TvoraMark in grain disc + big tv-metal-text TVORA + caption), values row (cinema/football/language). Privacy/Terms — shared LegalPage: clause-by-clause Reveal with ice dash markers, ar-IQ/en-GB formatted last-updated line.
- notfound-view.tsx: full-height cinematic 404 — giant tv-metal-text "404" (Manrope), TVORA mark, message + home CTA + search CTA (opens overlay), two drifting light beams (transform/opacity only) gated by useReducedMotion, vignette.
- i18n.ts: added keys (ar+en, additive only): search.recentClear/kbdShortcut/searchAction; list.all/movies/series/remove/removeFailed/undo; cw.remove/removedToast/removeFailed; auth.showPassword/hidePassword/pwStrength/pwWeak/pwGood/pwStrong/nameOptional/artQuote/demoTitle/fill; profile.guestTitle/adminHint/account; static.valuesTitle/valueCinema(D)/valueFootball(D)/valueLanguage(D)/markCaption.
- CROSS-FILE HOTFIX (out of scope, blocking): src/components/tvora/views/title-details-view.tsx line 224 had invalid JSX (`{cond && (…) : null}` — parse error 500ing the entire shell for all agents); changed `&&` → `?` to match the sibling ternary. Lint verified on that file after fix.
- RTL/a11y: logical utilities only (ms/me/ps/pe/start/end) in all my files; dialog/listbox/option/combobox roles, aria-pressed/aria-invalid/aria-labels, tv-focusable on interactives; no sync setState in effect bodies anywhere (state resets live in handlers, fetches in async callbacks).
- Verification: `bunx eslint` on all 7 owned files → 0 errors/warnings; `bunx tsc --noEmit` → no errors in my files (pre-existing errors exist in other agents' files); dev.log shows GET / 200 + APIs 200 after hotfix; remaining log noise is only background asset 404s (handled by fallbacks).

Stage Summary:
- Personal + account experiences complete and polished: cinematic universal search (keyboard-first, listbox a11y, recents), My List with filters/optimistic remove/undo, Continue Watching resume cards, premium split auth suite with real validation + strength meter + demo fill, profile hub with admin card, honest pricing/about/legal pages, cinematic 404 with reduced-motion-safe beam. App shell compiles and serves 200 for all routes; i18n stays additive and bilingual.

---
Task ID: 2-a
Agent: frontend-styling-expert (session timed out before self-report; work verified and patched by orchestrator)
Task: Home hero carousel + home rows + Movies/Series discovery + Title details.

Work Log:
- Created src/components/tvora/hero-carousel.tsx (~20KB): immersive full-bleed hero carousel across movie/series/match slides, auto-advance with pause, progress bars, prev/next, per-kind content (meta row, buttons, My List).
- Rewrote views/home-view.tsx: HeroCarousel integration, rows (Live Now, Trending, New, Arabic, Upcoming, Top Rated) + Continue Watching row injection via api.progressGet, ErrorState, FallbackImage helper (src/components/tvora/fallback-image.tsx).
- Rewrote views/discovery-view.tsx: sticky filter bar, genre chips (localized), sort/year selects, debounced in-results search, responsive grid, load-more, skeletons/empty/error.
- Rewrote views/title-details-view.tsx: cinematic backdrop, poster card, full metadata, trailer slot (honest placeholder), season selector + episode list (procedural thumbs), prev/next episode nav, similar works.
- Session hit the context deadline during verification; orchestrator verified compile (GET / 200), fixed one JSX slip later flagged by 2-c, lint clean.

Stage Summary:
- Home + catalog + details are production-quality, bilingual, RTL-safe; exports unchanged (HomeView, MoviesView, SeriesView, TitleDetailsView).

---
Task ID: 2-b
Agent: frontend-styling-expert (session timed out before self-report; work verified and patched by orchestrator)
Task: Football suite — live, matches, match details, watch page + player.

Work Log:
- Created src/components/tvora/scoreboard.tsx: StatusChip, CompetitionChip, MinuteBadge, CountdownChip, fmtTime/fmtDate/fmtLongDate/fmtDateTime, useTimezone, usePoll.
- Created src/components/tvora/player.tsx: TvoraPlayer with seek/volume/fullscreen/keyboard controls, LIVE mode (no seek) for match streams, resume + progress save (5s throttle), retry/auto-reconnect, PlayerSkeleton; HLS-ready.
- Rewrote views/live-view.tsx: stadium hero strip, auto-refreshing live scoreboard cards, honest empty state + next fixtures, competitions strip.
- Rewrote views/matches-view.tsx: day tabs + date input + status filter + competition chips + debounced team search, grouping by competition, timezone caption.
- Rewrote views/match-details-view.tsx: scoreboard hero, event timeline (home/away alignment), broadcast card (demo stream vs honest none), related fixtures, live polling.
- Rewrote views/watch-view.tsx: resolves movie/episode/match sources, episode nav across seasons, related rows, live mode player.
- Session timed out before verification; orchestrator fixed `source.kind === "series"` → `"episode"` TS narrowing after 2-c refactor and verified compile + player plays demo-match.mp4 (currentTime advancing).

Stage Summary:
- Full stadium experience working end-to-end; exports LiveView, MatchesView, MatchDetailsView, WatchView, TvoraPlayer, EpisodeNavButtons.

---
Task ID: 2-d
Agent: full-stack-developer (session timed out before self-report; work verified and patched by orchestrator)
Task: Protected admin panel.

Work Log:
- Rewrote views/admin-view.tsx: client gate (authReady loader / sign-in prompt / access denied), tab system synced to hash (#/admin?tab=…), header with DemoTag + View site.
- Created views/admin/admin-overview.tsx: count-up stat cards (movies/series/episodes/competitions/teams/users/list items/upcoming/live), provider status (honest not-configured badges), upcoming fixtures, recent activity timeline, "no fabricated analytics" note.
- Created views/admin/admin-content.tsx: movies/series table with poster thumbs, featured/trending/new/visible switches (optimistic PATCH), metadata edit dialog (ar/en titles, synopses, year, runtime, rating, ageRating, genres, playbackType/URL, poster/backdrop URLs), search + type filter.
- Created views/admin/admin-football.tsx: fixtures table with status/minute/score/streamType inline editing, live row highlight, competitions visibility switches.
- Created views/admin/admin-settings.tsx: demo mode info, homepage sections, honest maintenance/security notes.
- Created views/admin/admin-kit.tsx: shared admin primitives (Field, StatCard, SectionCard…).
- Verified by orchestrator: overview renders with real DB counts, PATCH /api/admin/titles/... returns 200, non-admin gate blocks correctly.

Stage Summary:
- Complete admin panel with server-enforced authz and honest data; export AdminView({tab}).

---
Task ID: 3
Agent: main (orchestrator)
Task: Integration, fixes, asset completion, browser E2E verification.

Work Log:
- Fixed TS errors: titles route orderBy typing, serialize.ts safeJson casts + seasonNumber chain, watch-view kind narrowing ("series"→"episode" after 2-b/2-c refactor), TitleCard transformPerspective → CSS class.
- Fixed hydration mismatch: hash-router/store read localStorage at module init → added mounted gate in TvoraApp (identical minimal shell SSR + first client render). Verified zero console errors on fresh load.
- Asset pipeline: diagnosed z-ai CLI constraints (sizes must be listed set + API requires multiples of 32 → 1344x768 heroes, 768x1344 posters) and 429 rate limits (parallel launches). Generated 12 AI images sequentially: hero-horizon, hero-sands (regenerated — first had baked-in text), hero-football, 9 posters. Generated 2 ffmpeg demo streams (demo-film.mp4, demo-match.mp4).
- Made shared Poster component resilient (FallbackImage with procedural fallback chain) — admin thumbnails + all posters degrade gracefully.
- Added metadataBase, sitemap.xml, .env.example, README (with Firebase migration path + demo accounts + integration steps).
- Full agent-browser E2E verified: home hero carousel + slides nav, My List toggle state sync, Movies filters, Series details + season/episode list, Live scoreboard + auto cards, Matches day tabs/filters/grouping + local kickoff times, Match details scoreboard + timeline, Watch player (video playing, src=/media/demo-match.mp4, currentTime advancing), Search overlay (typing → live results → Enter navigates), Auth golden path (clean state → login → redirect home → user chip), Admin gate (user denied → admin passes) + overview stats + content table + real PATCH 200, EN/LTR switch (dir flips, full translation), Mobile 390px (compact nav, menu, hero, rows), footer sticky at viewport bottom on short + long pages. Zero console errors in fresh sessions.

Stage Summary:
- TVORA is complete and browser-verified: all core flows work end-to-end in Arabic RTL and English LTR, desktop + mobile. Lint clean, typecheck clean (excluding pre-existing examples/skills), dev server stable.

---
Task ID: 4
Agent: main (orchestrator)
Task: SEO, docs, final polish.

Work Log:
- public/sitemap.xml + robots.txt (pre-existing), icon.svg favicon (original TVORA mark), OG metadata with hero image, metadataBase via NEXT_PUBLIC_SITE_URL.
- README.md: full setup, demo accounts, demo-mode honesty policy, production integration guide (TMDB/football provider, authorized playback, Firestore migration path), scripts.
- .env.example with placeholder values only (no secrets).
- Demo data clearly labeled across UI (DemoTag on football pages, hero, footer notice).

Stage Summary:
- Project ready for preview; deployment checklist documented in README.

---
Task ID: 1
Agent: main (Z.ai Code)
Task: إنشاء رابط تحميل للمشروع الكامل (download link for the complete project)

Work Log:
- فحصت هيكل المشروع والأحجام (node_modules 1.2G، .next 189M، public 3.2M، src 1.1M، db 320K)
- أنشأت ملفاً مضغوطاً project-source.zip (3.5MB، 214 ملفاً) مع استثناء node_modules و .next و skills و tool-results و upload و dev.log
- وضعت الملف في public/project-source.zip ليُخدَم عبر خادم Next.js
- تحققت من الرابط: GET /project-source.zip يرجع HTTP 200 بنوع application/zip

Stage Summary:
- رابط التحميل: /project-source.zip (يعمل عبر لوحة المعاينة)
- محتوى الأرشيف: src كامل + prisma + db/custom.db + public (صور وفيديو) + scripts + examples + كل ملفات الإعدادات (package.json, bun.lock, tailwind.config.ts, Caddyfile, tsconfig...)

---
Task ID: 5-a
Agent: frontend-styling-expert
Task: Motion upgrade — hero carousel, home rows, discovery grid.

Work Log:
- Read worklog + motion foundation (motion-fx.tsx, globals.css utilities, motion.ts) before touching anything; all edits additive, no foundation files modified.
- hero-carousel.tsx (wow centerpiece):
  - Backdrop: two-phase Ken-Burns — incoming slide starts scale 1.06 with subtle x/y offset, settles to 1.0 during the 1.05s dissolve, then drifts linearly to 1.08 over ~9.4s (transform/opacity only, per-property keyframes with times [0, 0.12, 1]); exit layer continues to 1.085. Reduced motion keeps the original simple 0.45s crossfade.
  - Content choreography per slide activation: wrapper eased (y 34→18, delay 0.12→0.05, 0.55s) + new `rise()` helper staggers badge (0.04) → headline (SplitWords h1, delay 0.12, word stagger 0.05) → meta (0.3) → synopsis (0.38) → CTA row (0.46); all delays collapse to 0 under reduced motion.
  - Primary CTA wrapped in `Magnetic strength=0.22` + `tv-btn-sheen` (both watch + info-only variants); secondary ghost button uses new `tv-ghost-glow` utility (border-glow hover/focus); data-testid="hero-watch", aria-pressed list toggle, keyboard handlers, autoplay clock (CSS fill + onAnimationEnd), pause-on-hover/focus/touch/tab-hidden all preserved.
  - Live badge: LiveDot → PulseRing in MatchMeta.
  - Progress bars: active track gets `tv-glow-breathe` + brighter bg, fill upgraded to ice→white gradient with glow shadow; linear ${SLIDE_MS} fill + play-state pause logic untouched.
- views/home-view.tsx:
  - Added `TickerStrip` — one Marquee under the hero (44s, border-y hairlines, champagne diamond separators, items duplicated ×2 so one loop exceeds ultrawide viewports); copy comes from new i18n `ticker.*` keys (static brand highlights only, no fabricated stats).
  - Added scroll cue (md+): mouse glyph + `tv-scroll-dot` bobbing wheel dot + `tv-float` chevron, centered above hero bottom (no clash with end-aligned progress bars on sm+), scrolls smoothly to an anchor before the first row (`scroll-mt-28`); respects prefers-reduced-motion at click time.
  - Added `LiveNowPill` (data-testid="live-pill", sm+ only): fixed bottom-start glass pill with PulseRing + sections.liveNow + first live fixture's real team names + real "+N" count, docks away on mobile where the Live Now row already covers it; entrance is one-shot.
  - All 7 rows wrapped in Reveal with cascading delays (live 0, trending .06, continue-watching .09, new .12, arabic .18, upcoming .24, top .3); Continue Watching row + its api.progressGet call intact.
  - RTL-safe throughout (insetInlineStart, ms/me, inset-x, mx-auto).
- views/discovery-view.tsx:
  - Sticky filter bar: rAF-throttled scroll/resize measure (setState only inside rAF callbacks — no sync setState in effect body) toggles `stuck` → glass (bg-[#0a0a0c]/85 + backdrop-blur-xl + hairline + deep shadow) vs transparent when in-flow; data-testid="filter-bar" kept.
  - Genre chips: shared framer `layoutId` white pill ("discover-chip-desktop" / "discover-chip-mobile" — separate ids so the desktop row and mobile panel never fight) spring-slides between active chips; static white bg retained on the button itself so reduced motion (span suppressed via useReducedMotion) still shows a solid active chip.
  - Grid wrapped in `Stagger`; each card in `motion.div layout variants={staggerItem}` so filtering reflows and appended load-more items inherit hidden→show; GridCard converted to plain `<article>` (reveal ownership moved to the wrapper, kills double-animation); keydown/Enter/space handlers, aria-labels, data-testid="title-card", load-more, skeletons, empty/error states all intact; search debounce, year/sort selects untouched.
- src/lib/i18n.ts (additive only, surgical Edits): `hero.scrollCue` and new `ticker` group (cinema/series/football/uhd/premieres/arabic, ar+en).
- src/app/globals.css (additive at END of @layer utilities, marked `/* 5-a */`): `.tv-ghost-glow` (border-glow hover/focus for hero secondary CTA), `.tv-scroll-dot` + keyframes (bobbing wheel dot). Both are CSS animations → auto-disabled by the global prefers-reduced-motion rule.
- Verification: `bunx eslint` on hero-carousel / home-view / discovery-view / i18n → 0 errors/warnings; `bunx tsc --noEmit` → zero errors under src/ (remaining errors are pre-existing examples/ + skills/ only); dev.log shows clean `✓ Compiled` after every edit with GET / 200 and /api/home 200.

Stage Summary:
- Home, hero and discovery now run the shared motion system end-to-end: cinematic Ken-Burns + choreographed slide reveals + magnetic/sheen CTAs + glowing autoplay bars in the hero; highlight ticker, cascade-revealed rows, scroll cue and a real-data live pill on home; glass-on-stuck filter bar, layoutId chip indicator and a stagger+layout reflowing grid in discovery. New i18n keys: hero.scrollCue, ticker.{cinema,series,football,uhd,premieres,arabic} (ar/en). Regression surface to re-test: hero autoplay/pause + keyboard nav, My List toggle from hero, home scroll cue anchor, LiveNowPill (only when live fixtures exist), discovery filter bar stuck glass + chip slide + grid reflow/load-more. No known risks: all previous exports/testids/aria/data-fetch paths preserved; orchestrator visual QA (agent-browser) intentionally not run per constraints.

---
Task ID: 5-c
Agent: frontend-styling-expert
Task: Motion upgrade — title details, library, auth, profile, static pages, 404, search overlay.

Work Log:
- title-details-view.tsx: BackdropParallax upgraded to depth parallax (useScroll+useTransform: y 0→120px, scale 1.05→1.15, gated by useMotionAllowed → style undefined under reduced motion; removed the old double scale-105 so resting zoom stays exact). Poster now sits inside TiltCard(max 7, glare via group parent) inside the existing entrance motion.div. Meta row + genre chips re-emitted as Stagger parents with local metaItem/chipItem variants (motion.span children, EASE_OUT_EXPO). Season <select> replaced by an accessible pill tab group (role="group" + aria-label=details.selectSeason + aria-pressed buttons; data-testid="season-select" preserved on the group, per-tab testids added) with a shared layoutId="tvora-season-pill" white pill that springs between active seasons; tab click keeps the exact old semantics (setSeasonNum + first-episode epId). Episode list container is now a motion.div (keyed by season id → stagger replays per season) with epItem variants on motion.button rows; episode thumbs got CSS hover zoom (group-hover/ep:scale-[1.09]). Trailer placeholder, prev/next episode nav, metadata grid, similar Row untouched. ChevronDown import dropped (no longer used).
- library-views.tsx: both grids (MyList + Continue) render inside motion-fx Stagger; ListCard/ContinueCard switched from index-delay animate to variants={staggerItem}. Wrapped grid children in AnimatePresence mode="popLayout" and added exit (opacity/scale ~0.9, 0.22–0.24s) — remove still goes through the untouched optimistic logic: MyList keeps snapshot revert + store sync + undo toast (restoreItem) + error toast; Continue keeps DELETE /api/progress revert. Index prop kept only for eager-loading thresholds. Removed now-unused EASE_OUT_EXPO import.
- auth-view.tsx: ArtPanel image now lives in an overflow-hidden wrapper and is driven by a 12s framer ken-burns (scale [1,1.09], x/y drift, repeatType:"reverse", skip under reduced motion). Form column is a motion container (formParent stagger 0.07) and every block (mobile brand, h1, sub, Field→motion.label, success card, links, demo card, submit) carries formItem variants. Submit button got tv-btn-sheen (+ whileTap 0.985, motion-safe). API-error card is now motion.p driven by useAnimationControls: the catch block starts an x:[0,-6,6,-4,4,-2,2,0] ~0.42s shake (motion-safe only) so every failed submit re-shakes, even for identical messages. Validation, strength meter, show/hide password, demo fill, return-path logic untouched.
- profile-view.tsx: cards switched from Reveal to RevealScale cascade (delays 0/0.05/0.1/0.12/0.15/0.18). Activity counts now use motion-fx CountUp — only real numbers: listIds.length and progressCount (null still renders "—", no fabrication). Avatar got a breathing halo (tv-glow-breathe opacity layer behind the initial disc). Guest card, language toggle, admin card, sign-out flow unchanged.
- static-views.tsx: pricing Premium card rebuilt as TiltCard(max 5) > tv-gradient-pan p-px glow-border layer (champagne→ice→live gradient, inline backgroundImage so the pan animates) > SpotlightCard inner panel with shared body JSX; non-featured plans get plain hover lift (-translate-y-1.5 + border/shadow). Feature lists are staggered motion.ul/with local featsParent/featItem variants (whileInView + viewportOnce). Current-plan badge moved to the Reveal wrapper (absolute -top-2.5 end-4, above the tilt). About values row is now a RevealX trio (start/end/start) with hover border tint; paragraphs + logo showcase + legal clause Reveal kept.
- notfound-view.tsx: message uses motion-fx SplitWords (word-by-word, reduced-motion safe); added 4 Beam accents (start/end positions, heights 26–52vh, delays 0.6–5.1s, 1–2px) inside the existing pointer-events-none aria-hidden field next to the two soft drifting beams + vignette; TvoraMark wrapped in a tv-float span. CTAs (home + search overlay open) preserved, data-testid="notfound-view" kept.
- search-overlay.tsx: panel entrance refined to spring (scale 0.98→1, y 12→0, stiffness 300 / damping 30; exit mirrors at 0.98). Results listbox is now a motion.div (same id/role/aria-label) with resultsParent/resultsSection/resultsRow variants — worst-case cumulative ≈0.30s (sections stagger 0.03s, rows 0.018s, 0.14–0.16s durations) so typing still feels instant; re-typing keeps same entry keys so rows don't re-animate mid-session. Shimmer rows, EmptyState, footer kbd row untouched. Cmd/Ctrl+K, Escape, arrow/Enter nav, aria-activedescendant, focus trap, scroll lock, recents storage, debounce + AbortController all byte-identical. One import-block slip (types/artwork lines briefly removed) was caught and fully restored within the same session; verified by eslint+tsc.
- i18n.ts: NO changes needed — every string reuses existing dict keys (details.selectSeason, hero.season, misc.notFound, pricing.*, profile.listCount/watchCount…). Zero dict drift risk.
- globals.css: NO /* 5-c */ additions needed — reused foundation utilities only (tv-gradient-pan, tv-btn-sheen, tv-glow-breathe, tv-float, tv-beam, tv-vignette); all new motion is framer-driven or Tailwind transitions, so the global reduced-motion rule covers everything.
- Verification: bunx eslint on all 7 owned files → 0 errors/warnings; bunx tsc --noEmit → 0 errors in src/ (only the 6 pre-existing examples/ + skills/ errors); dev.log shows only "✓ Compiled" lines and GET / 200 after the final edits. No dev-server restart, no build run.

Stage Summary:
- All 5-c surfaces now speak the motion language: cinematic parallax + tilt poster + layoutId season pill on details, staggered grids with animated removals in the library, ken-burns/shake/sheen auth, RevealScale + CountUp profile, spotlight/gradient-pan premium plan, beamed 404, and a springy fast-staggered search overlay. Functionality, testids, aria and optimistic logic fully preserved; i18n and globals.css untouched; only regression risk is visual (animation timing), not behavioral.

---
Task ID: 5-b
Agent: frontend-styling-expert
Task: Motion upgrade — scoreboard, live, matches, match details, watch player.

Work Log:
- scoreboard.tsx: ScoreBump now drives every rendered score (LiveScoreboard big score incl. data-testid="live-score", FixtureRow mobile + desktop score spans) — animates only on real polled value changes; dash rendered as separate muted span. StatusChip refactored internally (same DOM/classes/testids: status-live/ht/ft/postponed/cancelled/scheduled) into a single motion.span with mount micro-motion scale 0.9→1 + fade, gated by useReducedMotion. MinuteBadge: added tv-glow-breathe pulse and swapped LiveDot → PulseRing (expanding rings); text/dir untouched. LiveScoreboard: outer motion.article keeps entrance (per-card index delay, whileInView once) + data-testid="live-scoreboard"; visual card is now a SpotlightCard (mouse-follow glow) carrying border/gradient/shadow; watch CTA got tv-btn-sheen. FixtureRow: hover lift (-translate-y-0.5) + border/box-shadow glow via new tv-row-glow / tv-row-glow-live CSS (live rows keep red glow on hover).
- live-view.tsx: StadiumHero wrapped in RevealScale (once); headline now SplitWords as="h1" (word-rise, Arabic-safe); added 3 decorative Beams behind the strip (absolute, pointer-events-none, varied height/delay). LiveScoreboard cards already stagger per index (kept); OnAirChip/empty states/polling (usePoll 45s) untouched.
- matches-view.tsx: day tabs now use a shared layoutId pill ("matches-day-pill") that springs between active tabs (stiffness 480/damping 38), static span fallback when reduced-motion; labels, testids (day-<key>), aria-pressed unchanged. Group sections wrapped in Reveal (index delay) with accent bar animating scaleY 0→1 origin-top (gated by useMotionAllowed). Fixture rows get staggered entrance via per-row motion.div (index-delayed, whileInView once) — survives filter changes since re-mounted rows animate fresh. All filters (day/date/status/competition/search/retry) untouched.
- match-details-view.tsx: scoreboard hero entrance upgraded (scale 0.985→1, EASE_CINEMA) + one-shot tv-sweep light band; home/away team blocks are RevealX from opposite sides, RTL-aware (start-side team always slides from the start edge: from={dir === "rtl" ? "end" : "start"} for home); center score uses ScoreBump pair inside data-testid="match-score" (dir="ltr" kept). Timeline: desktop center rail draws in (scaleY 0→1 origin-top) with tv-timeline-flow flowing light, positioned at physical 50% (grid middle column is dir-agnostic); each event is a motion.li with staggered index-delay entrance; minute chips pop with spring (mobile chip + desktop marker caption). Broadcast card wrapped in Reveal, related fixtures in RevealScale. 60s live polling + honest no-stream/no-events states untouched.
- watch-view.tsx: player container wrapped in RevealScale (once); heading + demo tag row in Reveal; EpisodeNavButtons usage wrapped in Reveal; both related Rows (upcoming matches / similar titles) wrapped in Reveal. Source resolution, episode nav, progress resume flow untouched.
- player.tsx (visual/entrance only): LIVE corner badge + control-bar LIVE chip now use PulseRing (white on the red badge for contrast, red default in the control chip); bottom control bar gains a subtle slide-up tied to the existing auto-hide conditional (translate-y-2↔0, transition-[opacity,transform], same playing&&!pinned logic, group-hover/focus-within reveal intact); play/mute/fullscreen buttons get hover:scale-110 + ice drop-shadow glow (classes only). No handler, HLS, resume, progress-save, seek, volume or fullscreen logic touched; LiveDot import removed (fully replaced).
- globals.css: additive /* 5-b */ block at end of @layer utilities (after 5-a's block): .tv-row-glow(.tv-row-glow-live) hover border+glow rules and .tv-timeline-flow + @keyframes tv-timeline-flow. Global reduced-motion rule kills the CSS animation automatically.
- i18n.ts: NO changes needed — every motion addition reuses existing strings; zero new keys (additive-only constraint trivially satisfied).

Stage Summary:
- Full stadium motion pass shipped: bump-on-change scores, spotlight live cards, layoutId day pill, drawing timeline rail, popping minute chips, cinematic hero + sweeps, RevealScale player, pulsing LIVE chips, slide-up control bar — all GPU-safe transform/opacity, reduced-motion gated where JS drives it. eslint exit 0 on all 6 owned files; tsc --noEmit shows no errors under src/ (only the pre-existing skills/stock-analysis-skill error); dev.log compiles clean with GET / 200 after edits. Exports (LiveView, MatchesView, MatchDetailsView, WatchView, TvoraPlayer, EpisodeNavButtons, scoreboard exports) and all data-testids preserved. Regression risks: minimal — SpotlightCard adds a ::before glow layer on live cards (z-1, pointer-events-none); layoutId pill assumes one active tab at a time (true by construction); control-bar transform transition could slightly alter perceived hide timing (visual only).

---
Task ID: 5-verify (orchestrator QA + regression sweep)
Agent: main (Z.ai Code)
Task: Central verification of the full motion-graphics upgrade (5/5-a/5-b/5-c): lint, tsc, browser visual QA (RTL + LTR + mobile), regression sweep.

Work Log:
- Foundation (Task 5): built src/components/tvora/motion-fx.tsx (AuroraBackdrop, AmbientDust canvas w/ DPR≤1.75 + visibility pause + disposal, ScrollProgress, CursorGlow pointer-fine-only, SplitWords Arabic-safe word reveal, CountUp, TiltCard, SpotlightCard, Magnetic, Marquee, PulseRing, Beam, ScoreBump, RevealX/RevealScale, Stagger+staggerItem, useMotionAllowed). Added Motion FX keyframes/utilities to globals.css (tv-aurora-blob, tv-marquee-*, tv-shimmer-text, tv-pulse-ring, tv-sweep, tv-btn-sheen, tv-card-sheen, tv-spotlight, tv-float, tv-glow-breathe, tv-gradient-pan, tv-tilt, tv-beam). All auto-killed by the global prefers-reduced-motion rule.
- Upgraded app-shell.tsx: fixed ambient stack behind content, ScrollProgress top bar, CursorGlow, cinematic view transitions (enter y/scale, exit blur, one-shot tv-sweep light band per view). Nav: hide-on-scroll-down spring + hover glow pills + sheen sign-in. Footer: panning hairline, staggered columns, magnetic back-to-top (new i18n key footer.top ar/en). shared.tsx: SectionHeader auto-animates (kicker scaleX + SplitWords title), TitleCard hover sheen band (CSS-only), ViewLoader PulseRing, FixtureCard ScoreBump.
- QA findings + fixes:
  1. Ticker strip bidi garbling + letter-spacing on Arabic → fixed in home-view.tsx: per-item dir="auto" isolation; letter-spacing/uppercase only for EN. (Arabic typography law: never track Arabic.)
  2. "Matches today empty" — NOT a code bug: demo fixtures were seeded Oct 11, now Oct 16 → all "today/upcoming" kickoffs stale. Fixed by scripts/refresh-fixtures.ts (preserves users/lists/progress; re-dates live→now-65'/33', scheduled→+2h..+3d, finished→-1d..-2d, postponed→+5d). Verified: today=5, live=2. Recommend running it (or a cron) whenever demo data goes stale.
  3. Movies view blank after HMR Fast Refresh (exit-state frozen wrapper) — dev-only HMR artifact, clean reload renders fine; no production impact.
  4. False alarms cleared: My List toggle flips aria-pressed→true + sonner Toaster IS mounted (section[aria-label=Notifications]); earlier checks used wrong selectors/too-late timing.
- Browser E2E (agent-browser, RTL first): Home (Ken-Burns hero, SplitWords headline, sheen CTAs, live pill w/ PulseRing, ticker), Movies (SplitWords header, glass stuck filter bar, layoutId genre chips, staggered grid), Live (stadium hero + Beams), Matches (layoutId day pill, competition groups, live row glow, 65' badge), Match details (ScoreBump 1-1, RevealX badges, drawn timeline, honest broadcast card, correct ar-IQ dates "الجمعة، 16 تشرين الأول"), Watch (LIVE PulseRing badge, demo-match.mp4 playing, currentTime advancing, resume from saved progress), Auth (split layout, staggered form), Search (Ctrl+K spring overlay, live debounced results, click→navigate), EN switch (dir flips to ltr, full translation), Mobile 390px (compact nav, hero, rows, live cards), Admin (guest gate blocks; admin panel renders real counts 14/10/144/8/24/2, live fixture card), Footer sticky at bottom, no horizontal overflow.
- Final checks: bun run lint → 0 problems; bunx tsc --noEmit → 0 errors in src/; dev.log clean 200s; QA screenshots saved in /qa (18 captures).

Stage Summary:
- TVORA now has a complete A→Z motion-graphics system (ambient + transitions + reveals + micro-interactions + live-feedback), fully bilingual RTL/LTR, reduced-motion-safe, GPU-safe, with zero functional regressions. Exports/testids/a11y/data flows preserved across all views.

---
Task ID: 6-prep
Agent: main (Z.ai Code orchestrator)
Task: التحضير لتنفيذ 5 ميزات جديدة: بحث ذكي، توصيات شخصية، توليد أوصاف، معاينة تحويم، مشاهدة جماعية.

Work Log:
- قرأت worklog كاملاً وفهمت بنية TVORA (hash-routing، shared.tsx، api.ts، search-overlay، home-view، watch-view، player)
- فحصت أمثلة websocket (examples/websocket) وقررت منفذ 3005 لخدمة مشاهدة جماعية جديدة
- ثبّت socket.io-client@4.8.4 في المشروع الرئيسي (مطلوب للواجهة)
- أضفت كل مفاتيح i18n مسبقاً (ai.* + watchparty.* + preview.*) لتجنب تعارض الوكلاء المتوازيين على i18n.ts
- حددت عقود الملفات لكل وكيل لمنع تعارض التعديل:
  - 6-a: api/ai/* routes + api.ts + search-overlay + home-view + admin-content
  - 6-b: shared.tsx (TitleCard) + hover-preview جديد + globals.css
  - 6-c: mini-services/watch-party + watch-view + player

Stage Summary:
- البنية جاهزة؛ المفاتيح اللغوية موجودة؛ socket.io-client مثبت؛ الوكلاء 6-a و 6-b يعملان بالتوازي ثم 6-c

---
Task ID: 6-b
Agent: frontend-styling-expert
Task: Netflix-style hover video preview on title cards (650ms pointer dwell → muted demo-film.mp4 fades in over the poster, TVORA motion language).

Work Log:
- Read worklog (5/5-a/5-b/5-c/6-prep), shared.tsx TitleCard DOM/z-order, motion-fx.tsx (useMotionAllowed convention), i18n preview.* keys (pre-seeded by 6-prep — untouched), fallback-image.tsx, globals.css append convention (5-a/5-b blocks), src/lib/motion.ts easings. Confirmed public/media/demo-film.mp4 + demo-match.mp4 exist and serve (206 video/mp4).
- NEW src/components/tvora/hover-preview.tsx ("use client"), exports HoverPreview({ active }):
  - Gate: useState initializer computes window.matchMedia("(hover: hover) and (pointer: fine)") (SSR-safe via typeof window guard; render output is null regardless → no hydration risk); effect keeps it in sync on media-query change with proper listener cleanup. Reduced motion via motion-fx useMotionAllowed (framer useReducedMotion). enabled = pointerFine && motionAllowed; `if (!enabled) return null` → mobile/touch + reduced-motion never mount anything.
  - Lifecycle: AnimatePresence inside the component. active=true → mounts wrapper (motion.div absolute inset-0 z-[5], pointer-events-none, aria-hidden) fading opacity 0→1 @0.45s EASE_OUT_EXPO, with motion.video scaling 1.04→1 (transform/opacity only). Video: src=/media/demo-film.mp4 (film footage for ALL previews — demo-match is football, wrong for series), muted, loop, playsInline, preload="metadata", disablePictureInPicture, disableRemotePlayback, tabIndex=-1, object-cover; play() called in effect with .catch(() => {}) — no autoplay attribute.
  - Deactivate: effect on [active, enabled] pauses + rewinds currentTime=0 (try/catch for pre-metadata) immediately — the element stays mounted during the 0.45s exit fade, so it goes silent/blank at once; effect cleanup also pauses (StrictMode-safe); final unmount removes the element → browser aborts the request. Rapid hover cycles are safe: interrupted exits keep the same element (framer cancels unmount), AnimatePresence onExitComplete resets the `ready` chip state only after a real unmount so a fresh mount shows loading again.
  - Loading: until "canplay", a centered shimmer chip (tv-shimmer, text-[9px], t("preview.loading")) over a bg-black/40 scrim; after canplay it swaps to the demo-honesty chip at the top END corner (style insetInlineEnd:8 / top:8 — RTL-safe logical property): DemoTag-style border-[#d8c9a3]/25 bg-black/60 text-[#d8c9a3], t("preview.hint") + 3px rounded-full bg-[#d8c9a3] animate-pulse dot + title=footer.demoNotice tooltip. Used the plain dot (spec-sanctioned) because PulseRing's 10px expanding rings would overflow a tiny chip.
  - i18n via makeT(lang)+useAppStore directly (NOT useT from ./shared) to keep the import graph one-directional: shared → hover-preview → motion-fx/i18n/store.
- shared.tsx TitleCard (surgical): 650ms dwell timer (useRef<number|null>, cleared on leave/unmount; onMouseEnter starts, onMouseLeave cancels, onClick cancels before navigate; nothing wired to focus/keydown). <HoverPreview active={previewActive}/> mounted right after <Poster/> and before the sheen band. Added z-[6] to the hover-gradient overlay, corner badges and type chip so they stay above the video (sheen stays z-10, topmost). Zero behavior/props/testids/aria changed (verified by grep: data-testid="title-card", aria-label, aria-pressed, onClick/keyboard nav, My List toggle, whileInView entrance all intact).
- views/discovery-view.tsx GridCard: same pattern (dwell state + handlers + <HoverPreview/> after FallbackImage + z-[6] on gradient/badges/type chip). Low-risk by construction: the preview is an absolute overlay inside the card's own overflow-hidden poster div, so the Stagger/motion.div layout wrappers never measure it; included because discovery grids are the highest-value preview surface.
- globals.css: NO /* 6-b */ block needed — chips reuse tv-shimmer + Tailwind animate-pulse (both CSS animations, auto-killed by the global prefers-reduced-motion rule), all other motion is framer transform/opacity. Zero CSS additions per the spec's preference.
- Fixed one lint error caught by the new react-hooks/set-state-in-effect rule (removed a redundant sync readyState>=3 → setReady probe; onCanPlay is attached at element creation before any network activity so it cannot be missed). Final: bunx eslint on all 3 touched files → 0 problems; bunx tsc --noEmit → 0 errors under src/ (only the pre-existing examples/ + skills/ errors); dev.log shows clean "✓ Compiled" lines and GET / 200 after edits; no dev-server restart, no build.

Stage Summary:
- TitleCard + discovery GridCard now run a Netflix-style preview: 650ms pointer dwell → muted demo-film.mp4 fades in over the poster (opacity wrapper + 1.04→1 scale on the video, EASE_OUT_EXPO 0.45s), shimmer loading chip → champagne "معاينة/Preview" demo chip with pulsing dot at the top end corner; sheen band still sweeps above the video, gradient/badges/type chip above it at z-6. Decisions: gradient kept at z-[6] under the sheen (z-10) to preserve the pre-existing sheen-over-everything relationship — the spec's hard requirement (gradient/text above video) is satisfied; PulseRing swapped for the plain 3px pulsing dot per spec fallback; paused+rewound on deactivate and again in effect cleanup; one video per card, nothing loads on page load, mobile/touch and reduced-motion never mount. Skipped: zero globals.css additions (unnecessary). Regression risks: low — new hover handlers only touch pointerenter/leave on the poster button (focus/keyboard nav untouched); GridCard's overlay z-lift is className-only; theoretical risk is visual only (video encoding quality/framerate of the demo asset on low-end GPUs). Note for orchestrator QA: verify preview over a slow network shows the loading scrim first, and that card click still navigates while the preview is fading out.

---
Task ID: 6-a
Agent: full-stack-developer
Task: AI features end-to-end — natural-language smart search, personalized recommendations row, admin AI synopsis generation.

Work Log:
- Read worklog (Tasks 1/5/5-a/5-b/5-c/5-verify/6-prep) + exact patterns from api/search, api/progress, api/admin/titles, lib/auth (getActor/requireAdmin), lib/db, lib/serialize (safeJson/serializeTitle), lib/types (TitleDTO, GENRES_AR), lib/api (req helper), motion.ts (EASE_OUT_EXPO), search-overlay, home-view, admin-content, skills/LLM chat.ts SDK reference.
- Created src/app/api/ai/llm.ts — server-only shared plumbing: ZAI.create + one-shot chatJson() (role "assistant" system prompt + user msg, thinking disabled, temperature default) + defensive extractJson (strips ``` fences, outermost-object parse in try/catch) + asString/asStringArray validators. z-ai-web-dev-sdk imported ONLY under src/app/api/**.
- POST /api/ai/search: validates q (2..300), in-memory IP rate limit 10/min → 429; ONE completion returns strict JSON {keywords[2-5 lowercase], genres(from exact GENRES_AR keys), type|null, mood, answer(أنا/EN)}; plan parsed defensively with raw-keyword fallback; two-step retrieval (genre candidates + keyword OR-contains across titleAr/titleEn/synopsisAr/synopsisEn — SQLite stores genres as JSON string so filtering is in JS), merge/dedupe, score (genre +2, title kw +3, synopsis kw +1, +rating/10), type filter, take 12; retry with viewer's raw words when LLM keywords match nothing; LLM fully down → fallback:true, answer:null. Always 200 {answer, items: TitleDTO[], fallback}. force-dynamic + runtime nodejs.
- GET /api/ai/recommendations: identity via getActor() (session OR X-Device-Id); history = WatchProgress + UserList (visible titles); zero history → {items:[], answer:null, coldStart:true}; taste = genre frequency map; fully-watched (≥95% duration) excluded; 24 candidates ranked affinity*2+rating → compact rows (id/titleEn/titleAr/genres/year/rating/type) → LLM picks 8 ids STRICT JSON {ids[8], answer(lang from ?lang=)} → mapped back preserving model order; any failure → algorithmic top-8, answer null.
- POST /api/ai/synopsis: guarded exactly like admin/titles (requireAdmin → 403 {error:"forbidden"}); 404 unknown title; LLM writes cinematic 2–3 sentence synopsisAr+synopsisEn from REAL metadata (enrich-don't-contradict, spoiler-light); returns draft only (no persistence — admin reviews then saves via existing PATCH); model failure → 502 {error:"ai_unavailable"}.
- src/lib/api.ts: added aiSearch(q,lang), aiRecommendations() (reads store lang → ?lang=), aiSynopsis(titleId) on the existing req<T> helper; existing exports untouched.
- search-overlay.tsx AI mode: "اسأل الذكاء الاصطناعي" Sparkles button (data-testid="ai-search-btn", aria-label, visible when trimmed query ≥ 8) in a slim bar under the input with ai.searchHint aside; AI thinking state (PulseRing champagne + ai.thinking, aria-busy + aria-live, data-testid="ai-thinking"); AI results section (data-testid="ai-results") = Sparkles + ai.answerTitle header + champagne ai.poweredBy chip + answer sentence (text-white/70) + TitleCard grid (grid-cols-2 sm:3 lg:4, place-items-center) / ai.noResults / ai.error; entrance fade+scale with EASE_OUT_EXPO; instant listbox + empty-state gated with !aiMode (no double results) while input/recents/Escape/focus-trap/scroll-lock stay intact; generation-counter (aiGenRef) guards in-flight answers so ANY input edit/close exits AI mode instantly; Enter/arrow keyboard semantics unchanged (flat list empty in AI mode → natural no-op, no hijack).
- home-view.tsx: ForYouRow (fetches api.aiRecommendations on mount, renders nothing on cold start/empty/error) placed right after ContinueWatchingRow and before the newReleases Reveal — Reveal delay 0.1, Row with Sparkles champagne icon + ai.forYou/ai.forYouSub, TitleCard list, wrapper data-testid="foryou-row".
- admin-content.tsx: in EditTitleDialog above the synopsisAr textarea — outline Button (Sparkles / Loader2 while busy, data-testid="ai-synopsis-btn", aria-label ai.generate, disabled while generating OR saving) calling api.aiSynopsis(item.id) then filling both synopsis fields via the dialog's existing set() patcher + toast.success(ai.done,{description:ai.fillHint}) / toast.error(ai.error).
- Verification (curl): ar query → answer "أفلام حركة مليئة بالانتقام…" + items, fallback:false; EN "dark mystery thriller set in the city at night" → 11 items + EN answer; recommendations coldStart:true for fresh device, 8 items + Arabic answer with seeded history (test rows cleaned afterwards); synopsis admin → bilingual draft for Dawn Pursuit, guest → 403, demo user → 403; bun run lint → 0 problems; bunx tsc --noEmit → 0 errors under src/ (only pre-existing examples/skills errors); dev.log clean (✓ Compiled, all 200s + intended 403s), no restart, no build.
- Work record: agent-ctx/6-a-full-stack-developer.md.

Stage Summary:
- TVORA now has working AI end-to-end: smart natural-language search (bilingual answer + ranked real results with graceful keyword fallback + 10/min IP rate limit), a personalized "اخترنا لك" row driven by real watch/list history (honest cold start), and an admin-only bilingual synopsis generator that drafts into the existing edit dialog without persisting. All strings reuse the pre-seeded ai.* i18n keys; i18n.ts, globals.css, shared.tsx, player.tsx, watch-view.tsx untouched. Regression surface: search overlay render gates gained !aiMode (instant search behavior byte-identical otherwise); home gains one background LLM call per mount when history exists (row appears when ready; hidden on failure/empty). Risks: LLM latency 0.7–3s per call in sandbox; rate limiter is per-instance in-memory (resets on server restart) — acceptable for demo scale.

---
Task ID: 6-c
Agent: full-stack-developer (session hit tool-timeout after implementation + browser E2E; orchestrator appended this record from verified artifacts)
Task: Watch Party — real-time synchronized playback + live chat (socket.io mini service + frontend integration).

Work Log:
- Created mini-services/watch-party/ (independent bun project, own package.json + bun.lock + node_modules, script "dev": "bun --hot index.ts", PORT hardcoded 3005). Installed socket.io@4.8.x, started in background (watch-party.log), auto-restart on file change.
- Service (index.ts, documented event contract in header):
  - client→server: party:create {name} → ack {ok,code} | {ok:false,error:"name-required"}; party:join {code,name} → ack {ok} | error "room-not-found"|"name-required"; party:chat {content}; party:sync {positionSeconds,isPlaying,titleId?,kind?} HOST-ONLY (ignored otherwise); party:requestSync → private playback emit; party:leave + disconnect (host migration: earliest-joined remaining member promoted, system message announces).
  - server→client: party:state {code, yourSocketId, hostId, members[], messages[], playback} (to joiner/creator); party:members {members[],hostId}; party:playback {positionSeconds,isPlaying,updatedAt,titleId,kind}; party:chat user|system (join/leave/host events).
  - Rooms: 6-char unambiguous code (no 0/O/1/I), in-memory Map, last-60 messages, 10-min empty-room TTL sweep (log shows "room ... expired"), per-room socket.io rooms channel party:<code>.
- Frontend src/components/tvora/watch-party.tsx ("use client"): exports PartyStatus/PartyError/PartyMember/PartyPlayback/PartyMessage/PartyRoom types, defaultPartyName(lang,user), useWatchParty({ getVideoEl, isLive }) hook (connects io("/?XTransformPort=3005", path "/", websocket+polling, infinite reconnection), host play/pause/seeked listeners + 5s heartbeat + seek debounce, member apply logic target=position+(now-updatedAt) with 1.8s drift threshold, play/pause .catch guarded) and WatchPartyPanel({open,onClose,party}) — desktop end-side glass slide-in panel (bg-[#0a0a0c]/90 backdrop-blur-xl border-s hairline, dir-aware x slide + fade, EASE_OUT_EXPO), mobile bottom sheet; header with Users icon + status chip (PulseRing + connected/connecting/disconnected) + close; empty state (display-name input prefilled + create button tv-btn-sheen + join row with uppercase dir=ltr 6-char code input); room bar (big mono code dir=ltr + copy invite button Copy/Check swap + toast, role hint hostHint/memberHint), viewers chips (hash-colored avatars, host crown, "أنت" tag), chat list (system join/leave centered italic, self bubbles champagne tint, near-bottom-only auto-scroll, tv-no-scrollbar, max-h via flex), chat input (Enter sends, maxLength 300) + send, leave ghost button. localStorage "tvora:party-name". Full data-testid suite: party-panel/status/close/error/name-input/create-btn/code-input/join-btn/room-bar/code/copy/members/chat/chat-input/send/leave.
- player.tsx: ONE surgical addition — optional prop onVideoEl?: (el|null)=>void, called from the existing video element's ref callback. No other player logic touched.
- watch-view.tsx: "مشاهدة جماعية" button (Users icon + watchparty.start, data-testid="party-open") in heading row, only when source.src exists; party deep-link parsed from raw hash query (?party=CODE); useWatchParty wired with getVideoEl via TvoraPlayer onVideoEl + isLive (source.kind==="match"); host syncs on play/pause/seeked + heartbeat with titleId/kind; WatchPartyPanel mounted. Existing data resolution/episode nav/progress/related rows untouched.
- Verification: agent-browser 2-tab E2E — tab A created room (code M2Q4WF), tab B joined via invite URL, both panels showed connected + member chips, chat message from A appeared in B (server log: "[party] نورة joined M2Q4WF (2 inside)"); screenshots qa/party-*.png. Service log shows TTL sweep working. bunx eslint (watch-party.tsx, watch-view.tsx, player.tsx, mini-services/watch-party/index.ts) → 0 problems; bunx tsc --noEmit → 0 errors under src/.
- Orchestrator re-check after timeout: service still healthy on :3005 (400 attachment-check = socket.io OK), all files present, lint/tsc re-confirmed clean.

Stage Summary:
- TVORA now has a real Watch Party: create/join by code or invite deep link, host-authoritative playback sync (play/pause/seek + heartbeat, 1.8s drift correction), live bilingual chat with system join/leave/host events, viewer roster, host migration on host exit, 10-min room TTL. i18n keys pre-seeded (watchparty.*), zero globals.css additions. Regression surface: player gains one optional ref-callback prop (no behavior change); watch-view gains one button + panel + party hook. Known caveats: room state is in-memory (service restart clears rooms — acceptable for demo); member local seeks get re-synced on next event; LLM/party both independent of Next dev server.

---
Task ID: 6-d
Agent: main (Z.ai Code orchestrator)
Task: فحص نهائي شامل E2E للميزات الخمس + إصلاح خطأ مكتشف + تحديث رابط التحميل.

Work Log:
- lint (eslint .) → 0 مشاكل؛ tsc --noEmit → 0 أخطاء تحت src/؛ dev.log نظيف؛ الخدمة 3005 تعمل.
- اكتشفت وأصلحت خطأ حقيقياً: النقر السريع على أزرار التنقل (3+ تغييرات مسار خلال <300ms) يجمّد غلاف AnimatePresence mode="wait" في حالة exit (opacity:0, y:-10) → صفحة فارغة حتى التنقل التالي. الإصلاح في app-shell.tsx: استخرجت الانتقال إلى ViewTransition مع watchdog يفحص بعد 1100ms من كل تغيير مسار أن الغلاف صار مرئياً (opacity ≥ 0.05) وإلا يزيد suffix في المفتاح مرة واحدة لإعادة تشغيل حركة الدخول. تحقق: نفس سيناريو التقلب السريع → opacity:1 والصفحة ترسم كاملة.
- اختبار المتصفح E2E لكل الميزات:
  1. صف "اخترنا لك" (ForYou): ظهر بـ8 بطاقات من سجل المشاهدة الحقيقي — qa/6d-foryou.png.
  2. معاينة التحويم: بيئة headless تُبلغ hover:hover=false (جهاز لمسي) → البوابة عطّلت المعاينة بشكل صحيح؛ للتحقق البصري تجاوزت matchMedia داخل الجلسة فقط (بدون تعديل كود) → الفيديو شغّال (currentTime يتقدم، شارة "معاينة" ظاهرة). الملاحظة: لوحة معاينة المستخدم على متصفح سطح مكتب ستعمل تلقائياً.
  3. البحث الذكي: استعلام "فيلم أكشن عن انتقام في الصحراء" → إجابة عربية + 4 نتائج + شارة "مدعوم بالذكاء الاصطناعي" — qa/6d-ai-search.png.
  4. المشاهدة الجماعية (عبر البوابة :81 — المطلوب): إنشاء غرفة Z58QJY → "متصل" → رابط دعوة بتبويب ثانٍ انضم تلقائياً → رسالة دردشة من العضو وصلت للمضيف والعكس → قائمة المشاهدين تُظهر الاثنين → مزامنة تشغيل: المضيف أوقف عند 2.6s والعضو توقف عند 2.5s. لقطات qa/6d-party-*.png.
  5. توليد الملخصات: دخول admin → تعديل عنوان → زر "توليد تلقائي بالذكاء الاصطناعي" → توست نجاح + الحقول عُبّيت بالعربية والإنجليزية — qa/6d-ai-synopsis.png.
- أعدت توليد project-source.zip (3.5MB، 207 ملف) مع إضافة mini-services/ واستثناء node_modules بالكامل؛ الرابط /project-source.zip يعيد 200.

Stage Summary:
- كل الميزات الخمس (بحث ذكي، توصيات، أوصاف AI، معاينة تحويم، مشاهدة جماعية) متحقق منها في المتصفح من البداية للنهاية + إصلاح خطأ تجميد التنقل السريع. رابط التحميل محدث بالنسخة الكاملة.

---
Task ID: 7
Agent: main (orchestrator)
Task: طلب المستخدم — تحويل قسم المباريات إلى قسم "قنوات TV" يحتوي قنوات، وحذف قسم كرة القدم (كرة مباشرة) وقسم جدول المباريات بالكامل.

Work Log:
- Prisma: حذف نماذج Competition/Team/Fixture وإضافة نموذج Channel (code, nameAr/En, category, descriptions, nowPlaying EPG, colorA/B, quality, streamUrl, visible, sortOrder) + db:push.
- seed.ts: حذف بذر 8 مسابقات/24 فريقاً/17 مباراة؛ إضافة 17 قناة TV حقيقية الطابع (رياضة 3، أفلام 3، مسلسلات 3، أطفال 2، وثائقيات 2، أخبار 1، موسيقى 1، عام 2) مع وصف عربي/إنجليزي وبرنامج "يُعرض الآن" وتدفّق تجريبي (demo-match للرياضة، demo-film للبقية)؛ تحديث siteSettings؛ إعادة البذر؛ حذف scripts/refresh-fixtures.ts.
- أنواع/متسلسلات: ChannelDTO + CHANNEL_CATEGORIES، إزالة TeamDTO/CompetitionDTO/FixtureDTO، HomePayload بلا liveMatches/nextMatches، HeroSlide بلا match، SearchPayload = {titles, channels}، serializeChannel + إصلاح visible.
- artwork.ts: channelLogo (بلافة إجرائية مربعة بحروف القناة + LIVE) بدل teamBadge.
- API: جديد /api/channels (GET مع كاش) و /api/admin/channels (GET/POST) و /api/admin/channels/[id] (PATCH/DELETE) مع حماية admin؛ إعادة كتابة /api/home و /api/search (أصبح يبحث في القنوات) و /api/admin/overview؛ حذف /api/fixtures و /api/admin/fixtures و /api/admin/competitions.
- api.ts: channels()/adminChannels()/adminCreateChannel/adminUpdateChannel/adminDeleteChannel بدل fixtures.
- i18n: حذف كامل قسم football.* ومفاتيح المباريات؛ إضافة channels.* (عناوين، تصنيفات، مشغّل)؛ تحديث tagline/nav/ticker/search/admin/static/footer/profile.
- Router: ViewName الآن channels (بدل live/matches/match) مع تحويل روابط #/live و#/matches و#/match القديمة تلقائياً إلى القنوات.
- channels-view.tsx (جديد): هيرو استوديو بأشعة بث متحركة (Beam) + شارة "بث حي متواصل" نابضة + عدّاد القنوات؛ فلاتر تصنيف بعدّادات؛ شبكة بطاقات بشعارات إجرائية وشارات LIVE وجودة (4K/HD) وsheen عند التحويم؛ نافذة مشغّل غامرة (Dialog) ببث يتكرر (loop) + كتم/تشغيل صوت + شريط EPG "يُعرض الآن" + تنويه تجريبي؛ متجاوب 1→4 أعمدة ودعم reduced-motion.
- تنظيف شامل: حذف live-view/matches-view/match-details-view/scoreboard.tsx/admin-football.tsx؛ watch-view بلا دعم مباريات؛ hero-carousel بلا شرائح مباريات؛ home بلا صفوف مباريات وبلا LiveNowPill؛ search-overlay بقسم "قنوات TV"؛ shared بلا TeamBadge/FixtureCard؛ footer/nav/app-shell/layout/intro/static-views محدّثة؛ CSS: إضافة tv-scanlines وإزالة tv-row-glow/tv-timeline-flow.
- Admin: تبويب "قنوات TV" جديد (قائمة + بحث + إنشاء/تعديل كامل بحقول: رمز، تصنيف، أسماء، أوصاف، يُعرض الآن، رابط بث، جودة، لونان + معاينة شعار حية + إظهار/إخفاء + حذف بتأكيد)؛ AdminOverview بعدّاد القنوات وبلا مباريات.
- إصلاحان أثناء التحقق: إعادة تشغيل dev server لالتقاط Prisma Client الجديد؛ إضافة visible إلى serializeChannel (كانت الشارات تظهر "Hidden" خطأً).
- التحقق بالمتصفح (agent-browser): الرئيسية بلا مباريات؛ قسم القنوات يعمل (17 قناة، فلتر رياضة=3)؛ المشغّل يفتح ويشغّل البث؛ Escape يغلق؛ التحويل من الروابط القديمة؛ الإنجليزية "TVORA Live Channels"؛ دخول admin → إنشاء قناة اختبار وحذفها (تأكيد في DB)؛ نظرة عامة (17 Channels)؛ جوال 390px متجاوب؛ فوتر لاصق؛ ar/rtl وen/ltr؛ صفر أخطاء كونسول؛ lint نظيف.

Stage Summary:
- حُذفت ميزة كرة القدم بالكامل (واجهة + API + بيانات + سكربتات + CSS) وحُلّ محلها قسم "قنوات TV" متكامل بـ 17 قناة مباشرة مع مشغّل سينمائي وEPG.
- الملفات الجديدة: channels-view.tsx، admin-channels.tsx، /api/channels، /api/admin/channels (+[id])، شعار channelLogo.
- الملفات المحذوفة: live-view.tsx، matches-view.tsx، match-details-view.tsx، scoreboard.tsx، admin-football.tsx، refresh-fixtures.ts، مجلدات /api/fixtures و /api/admin/fixtures و /api/admin/competitions.
- لقطات التحقق: qa/channels-01..13 (الرئيسية، القسم، الشبكة، المشغّل، الإنجليزية، الإدارة، نظرة عامة، الجوال، الفوتر، النهائية).
- ملاحظة: public/project-source.zip لا يزال نسخة قديمة (اقتراح 10 سابق) — يحتاج إعادة حزم عند الطلب.

---
Task ID: 8
Agent: main (orchestrator)
Task: طلب المستخدم — صفحة تسجيل دخول سينمائية تظهر أول ما يدخل الزائر (بستايل صفحة X) مع شخصية تفاعلية حيّة فوق اسم الموقع على اليسار: ترمش بعينيها، تتبع الماوس، تضحك أحياناً وتنبكى أحياناً — "شيء يفوق الخيال".

Work Log:
- i18n: إضافة قسم gate.* كامل (عربي/إنجليزي): العنوان "المشاهدة تبدأ الآن."، أزرار جوجل/آبل/الجوال، الضيف، الشروط، و17 عبارة شخصية لـ"ڤو" (gate.face.*) لكل حدث: ترحيب، بريد، كتابة، بريد خاطئ، بيانات خاطئة، كلمة سر ضعيفة، بريد مأخوذ، عدم تطابق، نجاح، قريباً، ضيف، نقر، بكاء، ضحك، نعاس، ديمو، اسم.
- جديد src/components/tvora/gate/face-character.tsx — الشخصية "ڤو" (TV-face sprite): عينان كبيرتان بحدقات تتبع المؤشر عبر كامل الصفحة (useSpring)، رمش عشوائي مع رمشة مزدوجة (clipPath rects متحركة)، آلة مزاج ذاتية كل 5.4–9.7ث (ضحك/بكاء/دهشة/فرح بأوزان)، فم يتشوّه morphing بين 6 أشكال بنفس بنية المسار (M Q Q Z)، دموع متساقطة looped مع عيون لامعة عند البكاء، ارتقال رأس + عينان مغمضتان + خدود وردية + لسان + نجوم متطايرة عند الضحك، دهشة عند اقتراب المؤشر (cooldown 7.5ث)، نوم بعد 26ث خمول مع "z" متطايرة ويستيقظ لأي حركة، نقر على الوجه = ضحكة + تمايل، فقاعة كلام بآلة كاتبة فوق الرأس، نقطة REC نابضة، هالة بلون المزاج + حلقة مدارية منقطة، دعم reduced-motion كامل.
- جديد src/components/tvora/gate/login-gate.tsx — البوابة: تخطيط مرآتي مثل X (RTL: الوجه يسار/النموذج يمين، LTR: العكس)، لوحة الوجه: ڤو + شعار TVORA المعدني تحته + تڤورا + "استوديو العرض" + شرائح أفلام/مسلسلات/قنوات، نموذج: 3 أزرار اجتماعية (رد فعل + توست قريباً)، تدفق خطوتين بريد→كلمة مرور على API الحقيقي، إنشاء حساب مضمّن، تعبئة ديمو بضغطة، الدخول كضيف، مبدّل لغة EN/عربي داخل البوابة، كونفيتي 30 قطعة عند النجاح، اهتزاز عند الخطأ.
- app-shell.tsx: بوابة تُعرض عند mounted && authReady && !user && !tvora.guest (طبقة fixed z-95 تغطي التطبيق وتذوب scale+blur عند الدخول)؛ Intro الآن يؤجل حتى إغلاق البوابة؛ splash حتى authReady لمنع وميض البوابة لمستخدمي الجلسات القائمة.
- login-gate celebrateAndEnter: تسليم المستخدم للتطبيق بعد 1.5ث ليتمتع الزائر بالاحتفال (كان يُسلَّم فوراً فتختفي البوابة قبل الكونفيتي — أُصلح).
- إصلاح: setGuestOk(true) أصبحت لمسار الضيف فقط (كانت تُستدعى حتى بالحساب الحقيقي فلا تعود البوابة بعد تسجيل الخروج)؛ profile-view.signOut يمسح tvora.guest فيعود الزائر للبوابة.
- إصلاح lint/tsc: Variants types، SessionUser typing، إزالة setState المتزامن من effect (آلة كاتبة معاد هيكلتها)، initial opacity للـblush/tongue (قضت على تحذيرات framer "opacity from undefined")، وإصلاح خطأ مسبق في admin-overview (خاصية live شائبة).

Verification (agent-browser, كلها لقطات في qa/):
- gate-01/02: البوابة تفتح، فقاعة "أهلاً! أنا ڤو…" ✓. gate-03: العينان تتبعان المؤشر لأعلى اليمين ✓. gate-04: نقر الوجه = ضحك مفتوح الفم + لسان + خدود + نجوم + "هاهاها! خلاص وبطّل 😂" ✓. gate-05: بريد خاطئ = بكاء بدموع + حواجب حزينة + توهج أزرق + "هذا ما يشبه بريداً إلكترونياً 😅" + رسالة خطأ ✓.
- gate-06: خطوة كلمة المرور مع "السر بيني وبينك… 🤫" ✓. gate-08: نجاح الدخول = ضحك + "يلا بينا! أطفأت الأضواء؟ 🎬" + توست ترحيب ✓. gate-09: بعد 4.5ث → مقدمة سينمائية → الرئيسية والمستخدم مسجل ✓.
- gate-10/11: تسجيل الخروج يعيد البوابة تفاعلياً بدون reload ✓. gate-12: الدخول كضيف يدخل التطبيق ويضع tvora.guest=1 ✓.
- gate-13: جوال 390px — الوجه فوق والنموذج تحته متجاوب ✓. gate-14: الإنجليزية LTR معكوسة (نموذج يسار/وجه يمين) + مبدّل لغة ✓. gate-15/16/17: تسجيل حساب جديد (عدم تطابق = بكاء؛ نجاح = "أهلاً بك كريم 🎉" ثم الرئيسية بحساب كريم) ✓.
- صفر page errors؛ كونسول نظيف بعد الإصلاحات (بقي تحذير framer وحيد مسبق من ScrollProgress لحظة التحميل)؛ eslint 0 مشاكل؛ tsc 0 أخطاء تحت src/؛ dev.log نظيف.

Stage Summary:
- تڤورا الآن لها بوابة دخول سينمائية X-Style: أول ما يدخل الزائر يقابله "ڤو" — شخصية حية ترمش وتتبع الماوس وتضحك وتنكى وتنام وتتفاعل مع كل خطأ ونجاح — فوق شعار TVORA، وبجانبه تدفق دخول حقيقي (بريد→كلمة مرور/تسجيل/ضيف/ديمو) بالعربية والإنجليزية.
- الملفات الجديدة: gate/face-character.tsx، gate/login-gate.tsx. المعدلة: app-shell.tsx، profile-view.tsx، i18n.ts، admin-overview.tsx (خطأ مسبق).
- حسابات الدخول كما هي: demo@tvora.tv/demo1234 و admin@tvora.tv/tvora-admin-2025، أو "الدخول كضيف".

---
Task ID: 9
Agent: main (orchestrator)
Task: تجميل بوابة الدخول + أصوات تفاعلية لطيفة لڤو + اسم TVORA تفاعلي تحت الشخصية + ملف ZIP كامل للمشروع.

Work Log:
- جديد src/lib/vo-sounds.ts — محرك صوت مركّب 100% بـ Web Audio (بدون أي ملفات صوت): giggle (قهقهة "هي-هي-هي" متسارعة صاعدة)، cry (نائح كرتوني بفيبراتو + حزجة وشخيرة)، surprise/happy/yawn/wake (انفعالات)، pop (طقطقة رمش همسية مع throttle)، blip (فقاعة الكلام)، boing (نقرة ڤو)، pluck (نغمة بنتاتونية لحروف TVORA)، chime (أربيجيو نجاح + غليتر)، err (بزّة خطأ ناعمة). Unlock للـAudioContext عند أول لمسة/نقر/مفتاح، تباين عشوائي في طبقة الصوت كي لا تتكرر النبرة، ضغط DynamicsCompressor، كتم محفوظ في localStorage("tvora.sound") وفشل صامت آمن.
- face-character.tsx: setMoodFor أصبحت تغنّي حسب المزاج (ضحك/بكاء/دهشة/فرح/نعاس) وتبثّ حدث tvora:face-mood كي يرقص الاسم معها؛ الرمش أضاف pop، الفقاعة blip، النقرة boing+giggle، الصحوة wake، واستيقاظ النعاس صوتي أيضاً. deps صُحّحت ([allowed]).
- جديد gate/interactive-wordmark.tsx — اسم TVORA حي تحت الشخصية: كل حرف يطفو بتموّج مستقل، حقل جذب مغناطيسي يرفع الحرف مع اقتراب المؤشر (useSpring بدون re-render)، hover يقفز بتدرج شامبين ذهبي وينقر نغمة بنتاتونية (T-V-O-R-A = لحن C-pentatonic فعلي)، النقر يدوّر الحرف دورة كاملة (CSS keyframes tv-letter-spin + key remount) مع انفجار شرارات ذهبية/جليدية ويرسل happy لڤو؛ مزامنة المزاج عبر tvora:face-mood: البكاء يذبّل الأحرف ويجمّلها بالأزرق، الضحك يرسل موجة قفز متدرجة، الدهشة hops. dir="ltr" مفروض على h1 كي لا تنعكس الأحرف في RTL.
- login-gate.tsx: زر كتم/تفعيل الصوت (Volume2/VolumeX) بجانب مبدّل اللغة مع aria-pressed وعنوان، fail() يعزف err قبل بكاء ڤو، celebrateAndEnter يعزف chime قبل الضحك والكونفيتي.
- i18n: gate.sound.{on,off,onAria,offAria} بالعربية والإنجليزية.
- globals.css: keyframes tv-letter-spin-kf (دوران 360° مع scale 1.25 بمنتصفه).
- إصلاحات أثناء الفحص: import useEffect ناقص في login-gate (Runtime ReferenceError)، انعكاس RTL للأحرف (AROVT→TVORA)، background shorthand كان يلغي background-clip:text فظهر الحرف كمستطيل ذهبي مصمت (استُبدل بـ backgroundImage ونُقل التدرج للغلاف الداخلي للGlyph كي يدور معه)، تكرار مفاتيح React (glyph-*/burst-*).

Verification (agent-browser، لقطات في qa/):
- s2/s3: البوابة تعمل، زر الصوت ظاهر، TVORA صحيحة RTL وLTR ✓. s4/s5: نقر الحروف = دورة كاملة كنص ذهبي + ڤو يفرح بخدود وردية ✓.
- s7: بريد خاطئ = ڤو يبكي بدموع + TVORA تذبل أزرق باهت متزامنة + رسالة خطأ + توست "الصوت مفعّل" ✓. s8: نقرة ڤو = ضحك بلسان ونجوم ✓.
- s9: جوال 390px متجاوب (الوجه فوق والنموذج تحت) ✓. s10: الإنجليزية معكوسة (ڤو يمين) ✓.
- s11: تعبئة ديمو → دخول → كونفيتي وضحك وchime → الرئيسية بتوست ترحيب ✓.
- صفر page errors، eslint 0 مشاكل، dev.log سليم.

Stage Summary:
- ڤو الآن يسمع: يقهقه عند الضحك، ينتحن عند البكاء، ينقر عند اللمس، ويرنّ عند النجاح — كل الأصوات مركّبة رقمياً بلا ملفات وزر كتم محفوظ.
- اسم TVORA تحت الشخصية صار كائناً حياً: أحياره نغمات موسيقية، يرقص مع مزاج ڤو، ويذبل عندما يبكي.
- public/project-source.zip (3.8MB، 231 ملفاً) أعيد بناؤه بأحدث الكود: بدون node_modules/.next/.git/skills/logs/qa، يشمل db/custom.db المزروع وجميع مكامن البوابة الجديدة، ويُحمّل من /project-source.zip (HTTP 200 مؤكد).
