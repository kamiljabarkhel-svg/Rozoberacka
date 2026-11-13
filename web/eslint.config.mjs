// ESLint pre Next.js 16 (flat config – `next lint` už neexistuje, spúšťa sa `npm run lint`).
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = [
  ...nextVitals,
  ...nextTs,
  // Fotky sú z Supabase Storage alebo ukážkové SVG; zmenšujú sa už pri nahrávaní, next/image netreba.
  { rules: { "@next/next/no-img-element": "off" } },
  // Nové pravidlá z eslint-plugin-react-hooks 7 sú pre React Compiler, ktorý nepoužívame. Náš vzor
  // (po načítaní stránky prečítať localStorage / adresu a nastaviť stav) je zámerný a funguje.
  { rules: { "react-hooks/set-state-in-effect": "off", "react-hooks/refs": "off", "react-hooks/purity": "off", "react-hooks/preserve-manual-memoization": "off" } },
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
      "public/ocr/**",
      "public/sw.js",
    ],
  },
];

export default eslintConfig;
