// V1.7.1: deterministic source reconciliation for ZIP-overwrite GitHub uploads.
// Removes ONLY known retired source files from prior versions; never touches SQL,
// database records, git metadata, environment variables or active modules.
// Idempotent on fresh V1.7.1 archives and GitHub/Vercel checkouts.
import { existsSync, lstatSync, rmSync } from "node:fs";
import { resolve, sep } from "node:path";

const root = resolve(import.meta.dirname, "..");

// Obsolete module directories from the Simple Expense Management migration.
const RETIRED_DIRS = [
  "app/(dashboard)/assets",
  "app/(dashboard)/budgets",
  "app/(dashboard)/cash-flow",
  "app/(dashboard)/credit-cards",
  "app/(dashboard)/debt-strategy",
  "app/(dashboard)/deposits",
  "app/(dashboard)/forecast",
  "app/(dashboard)/goal-planner",
  "app/(dashboard)/goals",
  "app/(dashboard)/health",
  "app/(dashboard)/loans",
  "app/(dashboard)/net-worth",
  "app/(dashboard)/recurring",
  "app/api/market",
  "features/assets",
  "features/budgets",
  "features/cash-flow",
  "features/credit-cards",
  "features/debt-strategy",
  "features/deposits",
  "features/financial-health",
  "features/forecasting",
  "features/goals",
  "features/loans",
  "features/net-worth",
  "features/recurring",
  "lib/market-data"
];

// Previously committed legacy UI components and duplicate root-level tests.
// Historical tests have already been archived under tests/legacy/from-v141.
const RETIRED_FILES = [
  "_diagnostic_only_external_shims.d.ts",
  "components/cash-flow-planner.tsx",
  "components/debt-strategy-planner.tsx",
  "components/deposit-term-comparison.tsx",
  "components/financial-goals-planner.tsx",
  "components/loan-simulator.tsx",
  "components/recurring-rule-launcher.tsx",
  "components/scenario-planner.tsx",
  "components/stock-market-sync.tsx",
  "tests/account-core.test.mjs",
  "tests/advanced-debt-strategy-ssi-market-data.test.mjs",
  "tests/budget-engine.test.mjs",
  "tests/calendar-interaction-performance-v118.test.mjs",
  "tests/category-engine.test.mjs",
  "tests/category-grid-save-performance-v119.test.mjs",
  "tests/credit-card-manager.test.mjs",
  "tests/database-foundation.test.mjs",
  "tests/deploy-build-fix.test.mjs",
  "tests/deposit-transfer-reports-v112.test.mjs",
  "tests/financial-goals-planner.test.mjs",
  "tests/financial-health-score.test.mjs",
  "tests/forecasting-scenario-planning.test.mjs",
  "tests/interest-deposit-manager.test.mjs",
  "tests/investment-assets-unified-transactions.test.mjs",
  "tests/loan-debt-manager.test.mjs",
  "tests/mobile-money-debt-funding-v071.test.mjs",
  "tests/net-worth-financial-position.test.mjs",
  "tests/next-security-patch-v102.test.mjs",
  "tests/production-release-v100.test.mjs",
  "tests/project-structure.test.mjs",
  "tests/recurring-calendar.test.mjs",
  "tests/release-candidate-v080.test.mjs",
  "tests/reports-insights.test.mjs",
  "tests/reports-recovery-pwa-v114.test.mjs",
  "tests/reports-render-pie-v115.test.mjs",
  "tests/reports-rsc-boundary-v116.test.mjs",
  "tests/reports-runtime-reliability-v113.test.mjs",
  "tests/reports-ui-calendar-v117.test.mjs",
  "tests/responsiveness.test.mjs",
  "tests/savings-goals.test.mjs",
  "tests/smart-cash-flow-planner.test.mjs",
  "tests/transaction-core.test.mjs",
  "tests/transfer-reports-reliability-v111.test.mjs",
  "tests/ui-design-system-v110.test.mjs",
  "tests/vercel-build-fix-v101.test.mjs"
];

let removed = 0;
for (const relative of [...RETIRED_DIRS, ...RETIRED_FILES]) {
  const target = resolve(root, relative);
  if (!target.startsWith(root + sep)) throw new Error(`Unsafe path: ${relative}`);
  if (!existsSync(target)) continue;
  // Refuse to follow symbolic links: never delete a path from outside source root.
  const stat = lstatSync(target);
  if (stat.isSymbolicLink()) throw new Error(`Refusing symlink: ${relative}`);
  rmSync(target, { recursive: stat.isDirectory(), force: false });
  console.log(`[Finzaro source sync] Removed retired source: ${relative}`);
  removed++;
}
console.log(`[Finzaro source sync] OK: ${removed} obsolete source paths removed (no DB changes)`);
