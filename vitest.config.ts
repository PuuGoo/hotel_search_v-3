import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Only pick up our explicit unit tests; never the Next.js app/build output.
    include: ["src/**/*.{test,spec}.ts"],
    environment: "node",
  },
});
