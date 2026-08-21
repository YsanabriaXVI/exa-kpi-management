import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist/**", "node_modules/**"] },
  ...tseslint.configs.recommended,
  {
    files: ["src/**/*.{ts,tsx}"], rules: { "@typescript-eslint/no-unused-vars": "off", "@typescript-eslint/no-explicit-any": "off" },
  },
  {
    files: ["src/features/scorecards/**/*.{ts,tsx}", "src/features/kpi-pool/PoolPeriodSchedule.tsx"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
    },
  },
);
