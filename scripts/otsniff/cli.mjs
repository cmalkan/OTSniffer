#!/usr/bin/env node
// otsniff — Malkan Solutions OT assessment toolchain CLI.

import { readFile, writeFile } from "node:fs/promises";
import { scanSecrets } from "./scanners/secrets.mjs";
import { scanSupplyChain } from "./scanners/supply-chain.mjs";
import { mergeFindings } from "./merge.mjs";
import { buildReport } from "./report.mjs";

const USAGE = `otsniff <command> [options]

Commands:
  scan:secrets        --target <path> --out <findings.json> [--asset <id>]
                      Secret / credential scan of a target path

  scan:supply-chain   --target <path> --out <findings.json> [--asset <id>]
                      GitHub Actions workflow audit of a local repo path
  scan:supply-chain   --repo <owner/name> [--token <gh-token>] --out <findings.json> [--asset <id>]
                      Remote repo audit (requires docker scanner)

  merge               --plant <plant.json> --findings <findings.json> --out <enriched.json>
                      Merge normalized findings into a plant fixture

  report              --plant <enriched.json> --out <report.pdf> [--html <report.html>]
                      [--client <name>] [--engagement <id>] [--authorizer <name>]
                      [--scope "<text>"] [--partner <name>]
                      Render the T1 Exposure Snapshot PDF (requires the 'report' docker service)

  help                Show this message

All heavy tools run inside Docker — see compose.toolchain.yml.
`;

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) {
      args[a.slice(2)] = argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[++i] : true;
    }
  }
  return args;
}

async function main() {
  const [, , cmd, ...rest] = process.argv;
  const args = parseArgs(rest);
  switch (cmd) {
    case "scan:secrets": {
      if (!args.target || !args.out) throw new Error("--target and --out required");
      const findings = await scanSecrets({ target: args.target, assetHint: args.asset || "unknown" });
      await writeFile(args.out, JSON.stringify({ findings }, null, 2));
      console.log(`wrote ${findings.length} findings to ${args.out}`);
      return;
    }
    case "scan:supply-chain": {
      if (!args.out) throw new Error("--out required");
      if (!args.target && !args.repo) throw new Error("--target or --repo required");
      const findings = await scanSupplyChain({
        target: args.target,
        repo: args.repo,
        token: args.token || process.env.GH_TOKEN,
        assetHint: args.asset || "unknown",
      });
      await writeFile(args.out, JSON.stringify({ findings }, null, 2));
      console.log(`wrote ${findings.length} findings to ${args.out}`);
      return;
    }
    case "report": {
      if (!args.plant || !args.out) throw new Error("--plant and --out required");
      const result = await buildReport({
        plantPath: args.plant,
        outPath: args.out,
        htmlOut: args.html,
        engagement: {
          partner_name: args.partner,
          client_name: args.client,
          engagement_id: args.engagement,
          authorizer: args.authorizer,
          scope: args.scope,
          scan_window: args["scan-window"],
        },
      });
      console.log(`wrote ${result.pages}-page report to ${result.outPath}`);
      return;
    }
    case "merge": {
      if (!args.plant || !args.findings || !args.out)
        throw new Error("--plant, --findings, --out required");
      const plant = JSON.parse(await readFile(args.plant, "utf8"));
      const { findings } = JSON.parse(await readFile(args.findings, "utf8"));
      const enriched = mergeFindings(plant, findings);
      await writeFile(args.out, JSON.stringify(enriched, null, 2));
      console.log(`merged ${findings.length} findings into ${args.out}`);
      return;
    }
    case "help":
    case undefined:
      console.log(USAGE);
      return;
    default:
      console.error(`unknown command: ${cmd}\n\n${USAGE}`);
      process.exit(2);
  }
}

main().catch((err) => {
  console.error(err.stack ?? err);
  process.exit(1);
});
