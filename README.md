# Finzaro V0.4.1 — Smart Cash Flow Planner · Deploy Fix

Finzaro V0.4.1 is a patch release for V0.4.0. It fixes a Vercel/Next.js production build error in the Money Calculator keypad.

## Fixed

`components/money-calculator-input.tsx` imported `Backspace` from `lucide-react`, but the installed Lucide package does not export that symbol. V0.4.1 removes that dependency and renders the backspace glyph as a small inline SVG.

## Database

No new SQL is required for V0.4.1. If V0.4.0 database setup was already applied, do not run any additional migration for this patch.

## Environment

No new environment variables are required.

## Deploy

1. Replace the V0.4.0 source with this V0.4.1 package.
2. Push to GitHub.
3. Redeploy on Vercel.
4. The installed Finzaro PWA can use its update prompt to load V0.4.1.

All Smart Cash Flow Planner features, horizontal quick suggestions and Money Calculator behavior from V0.4.0 remain intact.
