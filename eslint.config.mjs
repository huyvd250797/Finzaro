// ESLint 9.17 flat config: avoid eslint/config, which was added in ESLint 9.22.0.
// Keep lint rules and ignores equivalent to the Next.js 16 baseline.
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

export default [
  ...nextVitals,
  ...nextTs,
  // A standalone ignores-only config is global in ESLint 9 flat config.
  { ignores: [".next/**", "out/**", "build/**", "next-env.d.ts"] },
];
