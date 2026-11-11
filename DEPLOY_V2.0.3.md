# Finzaro V2.0.3 — Splash & Calendar Interaction Fixes

## What changed

- App root restores the branded splash. It appears on a fresh document/PWA start, not on every Next.js internal navigation.
- Duplicate-transaction calendar highlights the original date violet, chosen target dates sky, completed targets green. Original date remains selectable as in previous versions; if selected, it keeps a violet ring around the sky fill.
- Transaction category selector caps at four visible rows and scrolls internally.
- Transaction history day groups toggle via accessible native `<details open>`; all expand by default.
- Calendar transaction swipe rows permit vertical scrolling, preserving horizontal reveal actions. Overlay and mobile PWA scroll chaining updated.

## Deploy

1. Replace full source in the existing repository and remove superseded files if any (source:sync handles explicitly retired routes). Keep existing environment variables.
2. Use Node 22, npm 10; run `npm install`, `npm run release:check`, `npm run typecheck`, `npm test` and `npm run build`.
3. Deploy normally; verify `/api/version` returns `2.0.3`. If an installed PWA keeps old assets, close/reopen it or refresh after the service worker update.
4. Manual smoke-test on mobile and desktop: hard-load splash; copy a previous-month transaction and verify three calendar colors; >12 categories on mobile and >16 on desktop; collapse individual days; swipe both horizontally and vertically on calendar details and bottom sheets.

**No database migration.** Do not rerun old migrations or reset Supabase data.
