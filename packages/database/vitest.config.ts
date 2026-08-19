import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    setupFiles: ["./vitest.setup.ts"],
    // Testes de integração tocam o Postgres real (mesma constraint, sem mocks) —
    // roda em série pra não gerar ruído de conexões concorrentes desnecessário.
    fileParallelism: false,
  },
});
