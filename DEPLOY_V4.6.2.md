# Finzaro V4.6.2 — Market Price Reliability Fix

## Scope
- Based on V4.6.1 (7 modules retained). This is NOT the old V4.6.2 Automatic Market Price Sync.
- Fixes stock integer parsing (no invalid `{1,0}` RegExp) in create, edit, trade.
- Gold PNJ source: `https://giavang.pnj.com.vn/` public board. Convert published **thousand VND / lượng** to **VND / chỉ** with divisor 10, using PNJ's **buy** column for valuation. Quote time is the publisher's timestamp when parsed.
- Stock Vietcap via `vnstock-js@2.0.0` (public, server only) with **VND per share**, cache 120 seconds. Optional SSI FastConnect remains if you supply keys.
- When provider is SSI but credentials are absent, fall back to Vietcap without migrating existing investment positions.
- Shows incomplete total, missing-source reasons, and clearly labels manual fallback. Gold input unit label and calculation are dynamic.
- **No Cron, no Supabase Realtime, no market price writes or background polling**. Quotes are requested only when page is rendered (with TTL cache), snapshot is manually saved.

## Steps
1. Back up Supabase and ensure V4.6.0 + V4.6.1 migrations have been applied.
2. Run **only** `supabase/migrations/20261120163000_market_price_reliability_v462.sql` from Supabase SQL Editor. The TXT distributed with this ZIP is identical.
3. Push the full source using ZIP sync with removal of obsolete files and redeploy Vercel (Node 22); `vnstock-js@2.0.0` is a new NPM dependency.
4. On Vercel Production, verify `/portfolio`: new stock MBB + integer quantity, edit/mua/bán, quote from Vietcap, PNJ ring bid price for one chi, 41 chi conversion, fallback price, crypto.
5. If an API is blocked, check Vercel runtime logs for upstream network policy/errors and compare with PNJ/Vietcap original quote. **Do not treat a missing quote as zero**.

## Credentials
- No PNJ or Vietcap API Key needed for best-effort public source.
- Optional: `SSI_CONSUMER_ID`, `SSI_CONSUMER_SECRET` to use authenticated SSI FastConnect v2.
- Optional: `COINGECKO_DEMO_API_KEY` for USDt/VND FX.
- Do not add `MARKET_SYNC_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`, Cron or pg_net just for this release.

## Verification boundary
- Offline tests and TS syntax verification confirm implementation constraints but cannot validate public feed availability from a real Vercel IP, Next production build with actual packages, or execute migration against production Supabase.
- Vietcap via `vnstock-js` is public but is not an official market-data SLA; confirm upstream terms before commercial redistribution.
- PNJ markup may change; public board is HTML, not guaranteed stable API. On failure Finzaro must retain missing/manual state.
- Quotes may be cached for 120 seconds (VCI) / 300 seconds (PNJ); refreshing does not bypass the provider TTL.
