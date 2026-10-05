# Finzaro V0.1.2 — Vercel build fix

This patch addresses the TypeScript errors reported by Vercel after V0.1.1.

## Fixed

1. Removed `sendDefaultPii: false` from:
   - `instrumentation-client.ts`
   - `sentry.server.config.ts`
   - `sentry.edge.config.ts`

   The installed `@sentry/nextjs` typings in this project do not accept that property. Omitting it also avoids opting into default PII collection.

2. Changed the 512px PWA icon manifest value from:

   `purpose: "any maskable"`

   to:

   `purpose: "maskable"`

   This matches the `MetadataRoute.Manifest` type accepted by Next.js 16.

3. Updated visible app branding to `Finzaro` and bumped the package/app patch version to `0.1.2`.

## Redeploy

Push this source to GitHub and redeploy on Vercel. If Vercel still shows an older error, redeploy once with build cache disabled.
