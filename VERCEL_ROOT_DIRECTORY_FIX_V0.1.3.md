# Vercel Root Directory Fix — V0.1.3

## Why this patch exists
Vercel reported `No Next.js version detected` even though the application root `package.json` declares `next`. The V0.1.2 archive also contained npm workspaces and placeholder `package.json` files under `packages/*`, so a Vercel project configured with a package subfolder as Root Directory could inspect the wrong manifest.

## Changes in V0.1.3
- The app is a single deployable Next.js project at the repository root.
- Removed the unused `workspaces` field.
- Removed placeholder `packages/*/package.json` files. The reserved domain folders remain as source placeholders.
- Added `vercel-build: next build`.
- Distribution ZIP is flat: `package.json`, `src/`, `next.config.ts`, and `vercel.json` are at archive root.

## Required Vercel project settings
In **Vercel > Project > Settings > Build and Deployment**:
1. Framework Preset: **Next.js** (or Auto-detected).
2. Root Directory: **`.` / repository root**. Do not select `packages/ui`, `packages/db`, or another subfolder. If the UI shows a configured subdirectory, clear it so the repository root is used.
3. Build Command: leave default, or use `npm run build`.
4. Install Command: leave default, or use `npm install`.
5. Output Directory: leave default (`.next`).

Redeploy once with build cache disabled after changing Root Directory.

## GitHub layout must look like this
```text
<repo-root>/
  package.json
  next.config.ts
  vercel.json
  src/
  public/
  packages/
  supabase/
```

It must NOT look like:
```text
<repo-root>/Finzaro-v0.1.3/package.json
```
unless Vercel Root Directory is explicitly set to `Finzaro-v0.1.3`.
