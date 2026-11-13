// Compatible with ESLint 9.17.0 pinned in package.json.
// `eslint/config` (defineConfig/globalIgnores) is not exported by that version.
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

export default [
  ...nextVitals,
  ...nextTs,
  // An ignores-only flat-config object applies globally in ESLint 9.
  { ignores: [".next/**", "out/**", "build/**", "next-env.d.ts"] },
];
