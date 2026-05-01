#!/usr/bin/env node
// pull-all.mjs — orchestrator that runs every feed puller in sequence.
// Used by the auto-refresh service in compose.toolchain.yml and by the
// GitHub Actions cron workflow. Skip a step by setting the matching env
// var, e.g. SKIP_NVD=1.

import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const HERE = path.dirname(fileURLToPath(import.meta.url));

const STEPS = [
  { name: "CISA",   skipEnv: "SKIP_CISA",   script: "pull-cisa.mjs", args: [] },
  { name: "NVD",    skipEnv: "SKIP_NVD",    script: "pull-nvd.mjs",  args: [] },
];

async function main() {
  console.log(`[${new Date().toISOString()}] feed refresh starting`);
  for (const step of STEPS) {
    if (process.env[step.skipEnv]) { console.log(`  ${step.name}: skipped (${step.skipEnv}=set)`); continue; }
    console.log(`\n[${step.name}] running ${step.script}…`);
    try {
      await runStep(step);
      console.log(`[${step.name}] done`);
    } catch (err) {
      console.error(`[${step.name}] FAILED: ${err.message}`);
      // Continue to next step rather than abort — partial refresh is better than none
    }
  }
  console.log(`\n[${new Date().toISOString()}] feed refresh complete`);
}

function runStep(step) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [path.join(HERE, step.script), ...step.args], {
      stdio: "inherit",
      env: process.env,
    });
    child.on("error", reject);
    child.on("close", (code) => code === 0 ? resolve() : reject(new Error(`exit ${code}`)));
  });
}

main().catch(err => { console.error(err.stack || err); process.exit(1); });
