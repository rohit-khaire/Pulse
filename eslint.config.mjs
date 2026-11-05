import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const base = [...nextVitals, ...nextTs];

// Rules that the original prototype code (and read-only streams) trip. Downgrade to "warn" so CI
// stays meaningful for NEW errors without blocking on pre-existing style debt. Only rules that
// actually exist in the loaded plugins are touched, so a plugin upgrade cannot break this file.
const known = new Set(
  base.flatMap((c) =>
    Object.entries(c.plugins ?? {}).flatMap(([ns, p]) =>
      Object.keys(p.rules ?? {}).map((r) => `${ns}/${r}`)
    )
  )
);
const SOFTEN = [
  "@typescript-eslint/no-explicit-any",
  "@typescript-eslint/no-unused-vars",
  "@typescript-eslint/ban-ts-comment",
  "react/no-unescaped-entities",
  "react-hooks/set-state-in-effect",
  "react-hooks/purity",
  "react-hooks/refs",
  "react-hooks/immutability",
  "react-hooks/preserve-manual-memoization",
  "react-hooks/static-components",
  "react-hooks/use-memo",
].filter((r) => known.has(r));

const eslintConfig = defineConfig([
  ...base,
  {
    rules: Object.fromEntries(SOFTEN.map((r) => [r, "warn"])),
  },
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "public/sw.js", // plain browser JS, linted by the service-worker test instead
    "playwright-report/**",
    "test-results/**",
  ]),
]);

export default eslintConfig;
