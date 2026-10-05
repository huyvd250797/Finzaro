import { rm } from "node:fs/promises";
import { resolve } from "node:path";

const staleFiles = [
  "instrumentation-client.ts",
  "instrumentation.ts",
  "sentry.server.config.ts",
  "sentry.edge.config.ts",
  "src/instrumentation-client.ts",
  "src/instrumentation.ts",
  "src/sentry.server.config.ts",
  "src/sentry.edge.config.ts",
];

for (const file of staleFiles) {
  await rm(resolve(process.cwd(), file), { force: true });
}

console.log("Build workspace cleanup complete.");
