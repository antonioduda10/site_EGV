import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL(".", import.meta.url)) } },
  test: {
    environment: "node",
    include: ["tests/unit/**/*.test.ts", "tests/integration/**/*.test.ts"],
    setupFiles: ["tests/setup.ts"],
    clearMocks: true,
    restoreMocks: true,
    maxWorkers: 2,
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "json-summary"],
      reportsDirectory: "coverage",
      include: [
        "lib/auth.ts", "lib/password.ts", "lib/rbac.ts", "lib/require-auth.ts",
        "lib/require-permission.ts", "lib/api-errors.ts", "lib/session-policy.ts",
        "app/api/auth/login/route.ts", "app/api/noticias/**/route.ts",
        "app/api/noticias/route.ts", "app/api/documentos/route.ts",
        "app/api/documentos/**/route.ts", "app/api/uploads/**/route.ts"
      ],
      exclude: ["app/api/noticias/upload/route.ts", "app/api/documentos/**/download/route.ts"],
      thresholds: { statements: 80, branches: 70, functions: 85, lines: 80 }
    }
  }
});
