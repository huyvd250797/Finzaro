# Finzaro V1.4.0 — Deployment and UAT

## Release scope

- Combined three requested stages **V1.2.3 → V1.3.0 → V1.4.0** in one **V1.4.0** source ZIP, starting from V1.2.2.
- Exactly six modules: Overview, Transactions, Accounts, Categories, Reports & Calendar, Settings.
- No loans, credit cards, deposits, goals, budgeting, stock or other removed financial modules reintroduced.
- No SQL migration. **Database must already have the V1.2.0 RPC migration.** Never delete historical finance tables as part of this release.

## Deployment

1. Back up the Supabase database before deployment; retain a reconciliation snapshot of account balances and sample transactions.
2. Ensure V1.2.0 baseline migration is applied and verify the create/update/delete simple transaction RPCs are present.
3. Run `npm install`, `npm run lint`, `npm run typecheck`, `npm run test` and `npm run build` with actual Supabase environment variables.
4. Deploy the **contents of the ZIP root** to Vercel, clear build cache if the previous build used an old bundle, and confirm `/api/version` reports `1.4.0`.
5. Smoke-test the scenarios below before switching regular use to the new version.

## Scenario checklist (use real test accounts, not production funds)

| Test | Expected |
|---|---|
| Open `/transactions?new=expense` | Fast form, amount first; no full history grid loaded before showing form |
| Open `/transactions?new=income` | Category/account defaults belong only to Income; no Expense values copied |
| Switch Chi → Thu → Chuyển in same launcher | No unintended amount/category/account carryover |
| Save valid expense/income | One record inserted; exact account balance adjustment |
| Submit invalid amount/category | Inline error; values remain in the form |
| Save same-currency transfer | One input for amount; source decreases and destination increases by the same amount |
| Save cross-currency transfer | Separate received amount required; account currencies and balances correct |
| Edit old ordinary transaction | Date lookup finds it outside the 160 latest rows; update is atomic |
| Delete an ordinary transaction | Correct rollback once; special historical records protected |
| Create from Calendar | Date prefilled; returns to same month/day after successful save |
| Overview/Reports/CSV | Historic and ordinary sums unchanged by UI update; no legacy borrowing counted as income |
| Open on iPhone PWA / Android / desktop | No oversized controls, clipped modal, taskbar or keyboard blocking Save |

## Optional latency baseline (staging only)

Set `FINZARO_PERF_LOG=1` server-side on a staging deployment to log timings (rounded milliseconds) for:
`overview.load`, `reports.overview.load`, `reports.calendar.load`, `transaction.create.rpc`, `transaction.update.rpc`, `transaction.delete.rpc`. No transaction amounts, user IDs or payload data are logged.

Use Chrome DevTools performance/network and iPhone PWA for form-open, input-to-paint and full save/redirect timing. Record at least 20 runs after warm-up. Compare p50/p95 by network/DB region and do not claim a target has been reached from Node regression tests alone. The server diagnostic cannot measure browser navigation latency or reflect device rendering; those require real-device checks.

## Known validation limit

The source ZIP does not include `node_modules`, and the current offline environment cannot resolve `registry.npmjs.org`; a full Next production build must be confirmed in CI or Vercel before treating this as a production-ready release. No production Supabase database was accessed or changed during packaging.
