// Suppress node-fetch url.parse() deprecation from pusher's dependency chain.
// Spawns Next.js with NODE_OPTIONS=--no-deprecation so the console stays clean.
const path = require("path");
const { spawn } = require("child_process");

const nextBin = process.platform === "win32"
  ? path.join(__dirname, "..", "node_modules", ".bin", "next.cmd")
  : path.join(__dirname, "..", "node_modules", ".bin", "next");

spawn(nextBin, ["dev", "-p", "3020"], {
  stdio: "inherit",
  env: { ...process.env, NODE_OPTIONS: "--no-deprecation" },
});
