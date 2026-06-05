import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    // Only pick up our explicit unit tests; never the Next.js app/build output.
    include: ["src/**/*.{test,spec}.ts"],
    environment: "node",
  },
});
