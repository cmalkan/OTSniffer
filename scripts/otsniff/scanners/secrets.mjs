// Secret-scanning wrapper. Tries a Docker-based scanner; falls back to a built-in
// regex pass so the toolchain is runnable without Docker. Fallback provenance
// is tagged as "manual" so the evidence trail never misrepresents its source.

import path from "node:path";
import { SEVERITIES } from "../schema.mjs";
import { run, walkFiles, safeRead, redact, makeFinding } from "./_base.mjs";

const NP_IMAGE = process.env.OTSNIFF_NP_IMAGE || "ghcr.io/praetorian-inc/noseyparker:latest";
const MAX_FILE_BYTES = 2 * 1024 * 1024;
const TEXT_EXT = new Set([
  ".txt", ".md", ".json", ".yml", ".yaml", ".toml", ".ini", ".cfg", ".conf",
  ".env", ".sh", ".py", ".js", ".mjs", ".ts", ".tsx", ".html", ".xml", ".csv",
  ".properties", ".log", ".plc", ".l5x", ".acd",
]);

const BUILTIN_PATTERNS = [
  { id: "aws_access_key", rx: /AKIA[0-9A-Z]{16}/g, severity: "high" },
  { id: "generic_api_key", rx: /api[_-]?key["'\s:=]+([A-Za-z0-9_\-]{24,})/gi, severity: "medium", redactGroup: 1 },
  { id: "private_key", rx: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g, severity: "critical" },
  { id: "plc_default_cred", rx: /\b(admin|root|operator):(admin|password|1234|plc|12345)\b/gi, severity: "high" },
  { id: "modbus_cred", rx: /modbus[_-]?(?:user|pass)[=:]\s*\S+/gi, severity: "medium" },
];

export async function scanSecrets({ target, assetHint = "unknown", forceBuiltin = false }) {
  const resolved = path.resolve(target);
  if (!forceBuiltin) {
    const viaDocker = await tryDockerScan(resolved);
    if (viaDocker) return viaDocker.map((f) => ({ ...f, asset_id: f.asset_id || assetHint }));
  }
  return builtinScan(resolved, assetHint);
}

async function tryDockerScan(target) {
  try {
    const out = await run("docker", [
      "run", "--rm",
      "-v", `${target}:/scan:ro`,
      NP_IMAGE,
      "scan", "--json", "/scan",
    ], { timeoutMs: 120_000 });
    return parseNoseyParker(out);
  } catch (err) {
    if (err && err.code !== "ENOENT") {
      process.stderr.write(`otsniff: docker scanner unavailable (${err.message}); using builtin fallback\n`);
    }
    return null;
  }
}

function parseNoseyParker(stdout) {
  const findings = [];
  for (const line of stdout.split(/\r?\n/)) {
    if (!line.trim()) continue;
    try {
      const rec = JSON.parse(line);
      const evidence = rec.snippet || rec.match || rec.rule_name || "secret match";
      findings.push(makeFinding({
        finding_type: "secret_leak",
        evidence: String(evidence).slice(0, 300),
        severity: mapNpSeverity(rec.score ?? rec.severity),
        confidence: typeof rec.score === "number" ? rec.score : 0.75,
        key: `${rec.rule_name || "np"}:${rec.path || ""}:${rec.line || ""}`,
        source_tool: "noseyparker",
      }));
    } catch { /* skip non-JSON chatter */ }
  }
  return findings;
}

function mapNpSeverity(s) {
  if (typeof s === "number") {
    if (s >= 0.9) return "critical";
    if (s >= 0.7) return "high";
    if (s >= 0.4) return "medium";
    return "low";
  }
  const v = String(s || "").toLowerCase();
  if (SEVERITIES.includes(v)) return v;
  return "medium";
}

async function builtinScan(target, assetHint) {
  const files = await walkFiles(target, { extensions: TEXT_EXT });
  const reads = await Promise.all(files.map((f) => safeRead(f, { maxBytes: MAX_FILE_BYTES })));
  const findings = [];
  for (const entry of reads) {
    if (!entry) continue;
    for (const pat of BUILTIN_PATTERNS) {
      for (const m of entry.text.matchAll(pat.rx)) {
        const raw = pat.redactGroup != null ? m[pat.redactGroup] : m[0];
        findings.push(makeFinding({
          finding_type: "secret_leak",
          evidence: redact(raw),
          severity: pat.severity,
          confidence: 0.6,
          key: `${pat.id}:${entry.file}:${m.index}`,
          asset_id: assetHint,
          source_tool: "manual",
        }));
      }
    }
  }
  return findings;
}
