# Deploy Finzaro V1.1.6

## What this patch fixes

V1.1.6 fixes the confirmed Reports React Server Component boundary crash. `/reports/page.tsx` no longer invokes `reportSliceColor()` from the `"use client"` `report-donut.tsx` module. The shared palette now lives in `features/reports/palette.ts`, which is safe to execute on the server and client.

## Database

No V1.1.6 SQL migration is required.

Keep the V1.1.2 migration applied if you use Account → Deposit → Goal funding and rollback.

## Deploy

1. Replace the complete repository source with V1.1.6.
2. Push to GitHub.
3. In Vercel, redeploy once with **Clear build cache**.
4. Confirm the Finzaro version badge reads **V1.1.6**.
5. Open **Báo cáo → Tổng quan** with a month that contains categorized transactions.
6. Verify the category pie, category ranking, Calendar, Analysis and category detail pages.

No Reports RPC migration is required for this patch.
