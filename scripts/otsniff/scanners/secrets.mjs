// Secret-scanning wrapper. Tries a Docker-based scanner; falls back to a built-in
// regex pass so the toolchain is runnable without Docker. Fallback provenance
// is tagged as "manual" so the evidence trail never misrepresents its source.

import { spawn } from "node:child_process";
import { readFile, readdir, stat } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import { SEVERITIES } from "../schema.mjs";

const NP_IMAGE = process.env.OTSNIFF_NP_IMAGE || "ghcr.io/praetorian-inc/noseyparker:latest";
const MAX_FILE_BYTES = 2 * 1024 * 1024;
const MAX_WALK_DEPTH = 12;
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
    const code = err && err.code;
    if (code !== "ENOENT") {
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
      findings.push(toFinding({
        evidence: String(evidence).slice(0, 300),
        severity: mapNpSeverity(rec.score ?? rec.severity),
        confidence: typeof rec.score === "number" ? rec.score : 0.75,
        key: `${rec.rule_name || "np"}:${rec.path || ""}:${rec.line || ""}`,
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
  const findings = [];
  const files = await walk(target, 0);
  const reads = await Promise.all(files.map(async (file) => {
    try {
      const st = await stat(file);
      if (st.size > MAX_FILE_BYTES) return null;
      return { file, text: await readFile(file, "utf8") };
    } catch { return null; }
  }));
  for (const entry of reads) {
    if (!entry) continue;
    for (const pat of BUILTIN_PATTERNS) {
      for (const m of entry.text.matchAll(pat.rx)) {
        const raw = pat.redactGroup != null ? m[pat.redactGroup] : m[0];
        findings.push(toFinding({
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

async function walk(root, depth) {
  if (depth > MAX_WALK_DEPTH) return [];
  const out = [];
  const s = await stat(root).catch(() => null);
  if (!s) return out;
  if (s.isFile()) return [root];
  for (const entry of await readdir(root, { withFileTypes: true })) {
    if (entry.name === ".git" || entry.name === "node_modules") continue;
    const p = path.join(root, entry.name);
    if (entry.isSymbolicLink()) continue;
    if (entry.isDirectory()) out.push(...(await walk(p, depth + 1)));
    else if (entry.isFile() && TEXT_EXT.has(path.extname(entry.name).toLowerCase())) out.push(p);
  }
  return out;
}

function redact(s) {
  if (s.length <= 8) return "***";
  return `${s.slice(0, 4)}***${s.slice(-2)}`;
}

function toFinding({ evidence, severity, confidence, key, asset_id, source_tool = "noseyparker" }) {
  const id = "f_" + createHash("sha1").update(key).digest("hex").slice(0, 12);
  return {
    finding_id: id,
    asset_id: asset_id || "",
    finding_type: "secret_leak",
    severity,
    evidence,
    source_tool,
    detected_at: new Date().toISOString(),
    confidence,
  };
}

function run(cmd, args, { timeoutMs = 60_000 } = {}) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { stdio: ["ignore", "pipe", "pipe"] });
    let out = "", err = "";
    const timer = setTimeout(() => { p.kill("SIGKILL"); reject(new Error("timeout")); }, timeoutMs);
    p.stdout.on("data", (d) => (out += d));
    p.stderr.on("data", (d) => (err += d));
    p.on("error", (e) => { clearTimeout(timer); reject(e); });
    p.on("close", (code) => {
      clearTimeout(timer);
      if (code !== 0) reject(new Error(`${cmd} exit ${code}: ${err}`));
      else resolve(out);
    });
  });
}
