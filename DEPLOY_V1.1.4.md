# Finzaro V1.1.4 deploy verification

1. Replace the repository contents with this release and deploy with Vercel **Clear build cache** once.
2. Open `/api/version` on the deployed domain. It must return `"version":"1.1.4"`.
3. Open the installed PWA. The header badge must show `V1.1.4`. If it still shows V1.1.2/V1.1.3, fully close and reopen once; V1.1.4 will hard-refresh when it detects the newer server version.
4. Open Reports → Overview, Calendar, Analysis and one Category detail page.
5. V1.1.4 has no database migration. V1.1.2 remains required only for Account → Deposit → Goal transaction integrity.

If Reports data is still empty after the header and `/api/version` both show V1.1.4, inspect Vercel Runtime Logs for `[Finzaro Reports]`. V1.1.4 logs each failed strategy separately: direct ledger, canonical transaction loader and legacy core ledger.
