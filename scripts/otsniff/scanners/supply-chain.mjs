// Supply-chain scanner. Tries a Docker-based GitHub Actions auditor; falls back to
// a built-in YAML pattern scan that surfaces the most common pwn patterns so the
// toolchain runs without external dependencies.
//
// Target shapes:
//   { target: "<path-to-repo-or-workflows-dir>", assetHint }
//   { repo:   "owner/name", assetHint, token }        // docker mode only

import { spawn } from "node:child_process";
import { readFile, readdir, stat } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import { SEVERITIES } from "../schema.mjs";

const GATO_IMAGE = process.env.OTSNIFF_GATO_IMAGE || "ghcr.io/praetorian-inc/gato-x:latest";
const MAX_FILE_BYTES = 1 * 1024 * 1024;
const YAML_EXT = new Set([".yml", ".yaml"]);

const WORKFLOW_PATTERNS = [
  {
    id: "pwn_request",
    severity: "critical",
    description: "pull_request_target used with PR ref checkout — classic code-execution-from-fork vector",
    test: (text) =>
      /pull_request_target\b/.test(text) &&
      /actions\/checkout@/.test(text) &&
      /ref:\s*\$\{\{\s*github\.event\.pull_request\.head\.(?:ref|sha)\b/.test(text),
  },
  {
    id: "script_injection",
    severity: "high",
    description: "untrusted github event field interpolated directly into run: block",
    test: (text) =>
      /run:\s*[\s\S]{0,300}?\$\{\{\s*github\.event\.(issue\.title|issue\.body|pull_request\.title|pull_request\.body|comment\.body|review\.body|head_commit\.message)/.test(text),
  },
  {
    id: "unpinned_action",
    severity: "medium",
    description: "third-party action referenced by tag/branch rather than commit SHA",
    test: (text) => /uses:\s*(?!actions\/)[\w.-]+\/[\w.-]+@(?!v?\d+\.\d+\.\d+(?!\-))(?!\w{40}\b)[^\s#]+/.test(text),
  },
  {
    id: "self_hosted_runner",
    severity: "high",
    description: "self-hosted runner label — vulnerable to fork-PR takeover on public repos",
    test: (text) => /runs-on:\s*\[?\s*self-hosted/.test(text),
  },
  {
    id: "secret_echo",
    severity: "high",
    description: "secret piped to echo/print/cat — risks log exfiltration",
    test: (text) => /(echo|printf|cat)\b[^\n]*\$\{\{\s*secrets\./i.test(text),
  },
  {
    id: "permissions_write_all",
    severity: "medium",
    description: "permissions: write-all grants the workflow token broad write scope",
    test: (text) => /permissions:\s*write-all\b/.test(text),
  },
];

export async function scanSupplyChain({ target, repo, token, assetHint = "unknown", forceBuiltin = false }) {
  if (!target && !repo) throw new Error("scanSupplyChain: --target or --repo required");
  if (!forceBuiltin && repo) {
    const viaDocker = await tryDockerScan({ repo, token });
    if (viaDocker) return viaDocker.map((f) => ({ ...f, asset_id: f.asset_id || assetHint }));
  }
  if (!target) return [];
  return builtinScan(path.resolve(target), assetHint);
}

async function tryDockerScan({ repo, token }) {
  try {
    const args = ["run", "--rm"];
    if (token) args.push("-e", `GH_TOKEN=${token}`);
    args.push(GATO_IMAGE, "enumerate", "--target", repo, "--output-json", "-");
    const out = await run("docker", args, { timeoutMs: 180_000 });
    return parseGato(out);
  } catch (err) {
    const code = err && err.code;
    if (code !== "ENOENT") {
      process.stderr.write(`otsniff: gato scanner unavailable (${err.message}); using builtin fallback\n`);
    }
    return null;
  }
}

function parseGato(stdout) {
  const findings = [];
  let parsed;
  try { parsed = JSON.parse(stdout); } catch { return findings; }
  const rows = Array.isArray(parsed) ? parsed : parsed.findings || parsed.results || [];
  for (const r of rows) {
    findings.push(toFinding({
      evidence: (r.description || r.rule || r.name || "supply-chain issue").slice(0, 300),
      severity: mapSeverity(r.severity),
      confidence: typeof r.confidence === "number" ? r.confidence : 0.8,
      key: `gato:${r.id || r.rule || ""}:${r.repository || ""}:${r.path || ""}:${r.line || ""}`,
      source_tool: "gato-x",
    }));
  }
  return findings;
}

async function builtinScan(target, assetHint) {
  const files = await walk(target, 0);
  const entries = await Promise.all(files.map(async (file) => {
    try {
      const st = await stat(file);
      if (st.size > MAX_FILE_BYTES) return null;
      return { file, text: await readFile(file, "utf8") };
    } catch { return null; }
  }));

  const findings = [];
  for (const entry of entries) {
    if (!entry) continue;
    for (const pat of WORKFLOW_PATTERNS) {
      if (!pat.test(entry.text)) continue;
      findings.push(toFinding({
        evidence: `${pat.description} (${path.relative(target, entry.file).replace(/\\/g, "/")})`,
        severity: pat.severity,
        confidence: 0.55,
        key: `sc:${pat.id}:${entry.file}`,
        asset_id: assetHint,
        source_tool: "manual",
      }));
    }
  }
  return findings;
}

async function walk(root, depth) {
  if (depth > 10) return [];
  const s = await stat(root).catch(() => null);
  if (!s) return [];
  if (s.isFile()) return YAML_EXT.has(path.extname(root).toLowerCase()) ? [root] : [];
  const out = [];
  for (const entry of await readdir(root, { withFileTypes: true })) {
    if (entry.name === ".git" || entry.name === "node_modules") continue;
    const p = path.join(root, entry.name);
    if (entry.isSymbolicLink()) continue;
    if (entry.isDirectory()) {
      if (depth === 0 && entry.name !== ".github" && !isWorkflowsPath(root)) {
        const nested = path.join(p, ".github", "workflows");
        if (await exists(nested)) out.push(...(await walk(nested, depth + 2)));
        else out.push(...(await walk(p, depth + 1)));
      } else out.push(...(await walk(p, depth + 1)));
    } else if (entry.isFile() && YAML_EXT.has(path.extname(entry.name).toLowerCase())) {
      out.push(p);
    }
  }
  return out;
}

function isWorkflowsPath(p) {
  return p.replace(/\\/g, "/").endsWith(".github/workflows");
}

async function exists(p) { return !!(await stat(p).catch(() => null)); }

function mapSeverity(s) {
  const v = String(s || "").toLowerCase();
  if (SEVERITIES.includes(v)) return v;
  if (v === "warning") return "medium";
  if (v === "error") return "high";
  return "medium";
}

function toFinding({ evidence, severity, confidence, key, asset_id, source_tool }) {
  return {
    finding_id: "f_" + createHash("sha1").update(key).digest("hex").slice(0, 12),
    asset_id: asset_id || "",
    finding_type: "supply_chain",
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
    p.stdout.on("data", (d) => { if (out.length < 4_000_000) out += d; });
    p.stderr.on("data", (d) => { if (err.length < 200_000) err += d; });
    p.on("error", (e) => { clearTimeout(timer); reject(e); });
    p.on("close", (code) => {
      clearTimeout(timer);
      if (code !== 0) reject(new Error(`${cmd} exit ${code}: ${err}`));
      else resolve(out);
    });
  });
}
