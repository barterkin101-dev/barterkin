import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Serwist-generated service worker bundles (not source code)
    "public/sw.js",
    "public/workbox-*.js",
    "public/swe-worker-*.js",
    // Parallel agent worktrees — not source code for this repo
    ".claude/worktrees/**",
  ]),
]);

export default eslintConfig;
