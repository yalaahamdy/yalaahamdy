import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";
import { dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const eslintConfig = [
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
      "@typescript-eslint/no-non-null-assertion": "off",
      "react/no-unescaped-entities": "off",
      "@next/next/no-img-element": "off",
      // The app intentionally syncs React state with external systems
      // (fetch orchestration, localStorage, next-themes) inside effects —
      // the classic "mounted" and progressive-loading patterns. Each case
      // sets state only on mount/route change, never per-render.
      "react-hooks/set-state-in-effect": "off",
    },
  },
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
      "public/**",
      "scripts/**",
      "research/**",
      "download/**",
      ".zscripts/**",
      "skills/**",
    ],
  },
];

export default eslintConfig;
