// Shared helpers for OTSniffer scanners. Each scanner in this folder uses these
// for spawning Docker-backed tools, walking the filesystem, reading files with a
// size cap, and emitting findings in the normalized schema shape. Per the
// architecture rules in CLAUDE.md, every scanner must:
//   1. Try a Docker-backed upstream tool first.
//   2. Fall back to a built-in scan tagged source_tool: "manual".
//   3. Redact secrets before emitting evidence.
// This module covers the mechanics. Per-scanner pattern logic stays in the
// individual scanner files.

import { spawn } from "node:child_process";
import { readFile, readdir, stat } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";

const DEFAULT_SKIP_DIRS = new Set([".git", "node_modules", ".venv", "__pycache__", "dist", "build"]);

// Bounded child-process runner. Caps stdout/stderr capture so a misbehaving
// scanner can't blow up Node's heap.
export function run(cmd, args, { timeoutMs = 60_000, maxOutBytes = 4_000_000, maxErrBytes = 200_000 } = {}) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { stdio: ["ignore", "pipe", "pipe"] });
    let out = "", err = "";
    const timer = setTimeout(() => { p.kill("SIGKILL"); reject(new Error("timeout")); }, timeoutMs);
    p.stdout.on("data", (d) => { if (out.length < maxOutBytes) out += d; });
    p.stderr.on("data", (d) => { if (err.length < maxErrBytes) err += d; });
    p.on("error", (e) => { clearTimeout(timer); reject(e); });
    p.on("close", (code) => {
      clearTimeout(timer);
      if (code !== 0) reject(new Error(`${cmd} exit ${code}: ${err}`));
      else resolve(out);
    });
  });
}

// Generic recursive file walker. Filters by extension, caps depth, skips the
// usual noise directories. Scanners with bespoke traversal (e.g. supply-chain
// looking for a nested .github/workflows) keep their own walker.
export async function walkFiles(root, { extensions, maxDepth = 12, skipDirs = DEFAULT_SKIP_DIRS } = {}) {
  const extSet = extensions instanceof Set ? extensions : new Set(extensions || []);
  const acceptExt = extSet.size === 0 ? () => true : (name) => extSet.has(path.extname(name).toLowerCase());

  async function walk(dir, depth) {
    if (depth > maxDepth) return [];
    const s = await stat(dir).catch(() => null);
    if (!s) return [];
    if (s.isFile()) return acceptExt(dir) ? [dir] : [];
    const out = [];
    let entries;
    try { entries = await readdir(dir, { withFileTypes: true }); }
    catch { return []; }
    for (const e of entries) {
      if (skipDirs.has(e.name)) continue;
      if (e.isSymbolicLink()) continue;
      const p = path.join(dir, e.name);
      if (e.isDirectory()) out.push(...(await walk(p, depth + 1)));
      else if (e.isFile() && acceptExt(e.name)) out.push(p);
    }
    return out;
  }

  return walk(root, 0);
}

// Read a file with a size cap. Returns null on any error or oversize.
// Avoids the duplicated try/catch + stat pattern across scanners.
export async function safeRead(file, { maxBytes = 2 * 1024 * 1024, encoding = "utf8" } = {}) {
  try {
    const s = await stat(file);
    if (!s.isFile() || s.size > maxBytes) return null;
    const text = await readFile(file, encoding);
    return { file, text, size: s.size };
  } catch { return null; }
}

// Short-secret redaction. For values up to 8 chars, returns "***". Otherwise
// shows first 4 and last 2 with "***" in the middle. Never returns the raw
// secret. Per CLAUDE.md: scanners must never emit raw match evidence.
export function redact(s) {
  if (typeof s !== "string") return "***";
  if (s.length <= 8) return "***";
  return `${s.slice(0, 4)}***${s.slice(-2)}`;
}

// Normalized finding factory. The finding_id is a deterministic hash of the
// supplied key so repeat scans against the same target produce stable IDs
// (this is what makes mergeFindings idempotent).
export function makeFinding({
  finding_type,
  evidence,
  severity,
  confidence,
  key,
  asset_id = "",
  source_tool,
  detected_at,
}) {
  return {
    finding_id: "f_" + createHash("sha1").update(String(key)).digest("hex").slice(0, 12),
    asset_id,
    finding_type,
    severity,
    evidence,
    source_tool,
    detected_at: detected_at || new Date().toISOString(),
    confidence,
  };
}
