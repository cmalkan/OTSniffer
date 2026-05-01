#!/usr/bin/env node
// refresh-loop.mjs — long-running loop that re-runs pull-all every N hours.
// Used by the `feeds` service in compose.toolchain.yml so a developer can
// have a single `docker compose up` that keeps feeds fresh in the
// background. Default cadence: 48 hours (every 2 days). Override with
// FEED_REFRESH_HOURS=24 etc.
//
// Logs each run to stdout. Service exits if pull-all crashes hard so docker
// can restart it; soft failures inside steps are logged but don't kill the
// loop.

import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const HOURS = Number(process.env.FEED_REFRESH_HOURS || 48);
const INTERVAL_MS = HOURS * 60 * 60 * 1000;

console.log(`[refresh-loop] cadence: every ${HOURS} hours`);

async function tick() {
  console.log(`[${new Date().toISOString()}] running pull-all`);
  await new Promise((resolve) => {
    const child = spawn(process.execPath, [path.join(HERE, "pull-all.mjs")], {
      stdio: "inherit",
      env: process.env,
    });
    child.on("close", resolve);
    child.on("error", (err) => { console.error("[refresh-loop] spawn error:", err); resolve(); });
  });
}

(async () => {
  // Run once immediately on container start, then loop on the cadence.
  await tick();
  while (true) {
    await new Promise(r => setTimeout(r, INTERVAL_MS));
    await tick();
  }
})();
