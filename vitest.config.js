import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["src/**/__tests__/**/*.test.js"],
    testTimeout: 30000, // 30s for property tests
    fileParallelism: false, // Run test files sequentially to avoid DB locks
    pool: "forks", // Use forks for better isolation
    poolOptions: {
      forks: {
        singleFork: true, // Run all tests in a single fork
      },
    },
  },
});
