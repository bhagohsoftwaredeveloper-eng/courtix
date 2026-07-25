import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { FlatCompat } from "@eslint/eslintrc";

const compat = new FlatCompat({
  baseDirectory: dirname(fileURLToPath(import.meta.url)),
});

const config = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    ignores: [".next/**", "node_modules/**", "data/**", "public/**"],
  },
  {
    rules: {
      // The court diagrams are static SVG strings we author ourselves, not
      // user input — this is the one place the rule is wrong.
      "react/no-danger": "off",
    },
  },
];

export default config;
