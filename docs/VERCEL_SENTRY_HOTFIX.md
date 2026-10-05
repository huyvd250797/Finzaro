# Vercel build hotfix — Sentry v11

## Symptom

```text
> Build error occurred
TypeError: (0 , _nextjs.withSentryConfig) is not a function
```

## Root cause

`@sentry/nextjs` v11 moved the build-time `withSentryConfig` helper to the dedicated `@sentry/nextjs/config` entry point.

## Fix applied

`next.config.ts` now uses:

```ts
import { withSentryConfig } from "@sentry/nextjs/config";
```

instead of:

```ts
import { withSentryConfig } from "@sentry/nextjs";
```

The SDK is also pinned to `@sentry/nextjs` `11.4.0` in `package.json` for deterministic Vercel installs.

## Redeploy

Commit the changed files, push to GitHub, then redeploy on Vercel. If Vercel reuses an old dependency cache, use **Redeploy** with **Use existing Build Cache** disabled once.
