import path from "path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest-setup.ts"],
    coverage: {
      provider: "v8",
      include: ["src/**/*.{ts,tsx}"],
      exclude: [
        "src/**/*.spec.{ts,tsx}",
        "src/app/**/layout.tsx",
        "src/app/**/page.tsx",
      ],
      // Measured baseline (2026-07-18, first apps/web test suite — TASK-062):
      // statements 20.88%, branches 16.47%, functions 18.96%, lines 21.56%.
      // Thresholds below are a regression floor with a small margin, not a
      // target — same method as apps/api's coverageThreshold (ADR-022). Most
      // of apps/web (api.ts, review-gate components, pages) has no tests yet;
      // this floor rises as future tasks add coverage for those.
      thresholds: {
        statements: 20,
        branches: 15,
        functions: 18,
        lines: 20,
      },
    },
  },
});
