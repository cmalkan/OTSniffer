# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Product

OTSniffer is a Netlify-deployed OT blast-radius analyst dashboard with an evidence-graded scanning toolchain (`otsniff`). It is being productized as an assessment service under **Malkan Solutions LLC**; the repo contains both the demo app and the CLI that runs real scans.

## Commands (all via Docker)

All npm and Python work runs inside containers defined in `compose.toolchain.yml`. Do not invoke `npm` or `pytest` on the host.

```bash
# Tests
docker compose -f compose.toolchain.yml run --rm node npm test                    # all Node tests
docker compose -f compose.toolchain.yml run --rm node npm test -- tests-js/evidence.test.mjs   # single test file
docker compose -f compose.toolchain.yml run --rm py pytest -q                     # Python tests
docker compose -f compose.toolchain.yml run --rm node npm run build               # build (no-op placeholder)

# Local UI + API (dev server routes /api/* to Netlify functions via createRequire)
docker compose -f compose.toolchain.yml up -d web                                 # http://localhost:3000
docker compose -f compose.toolchain.yml logs -f web
docker compose -f compose.toolchain.yml down

# Toolchain CLI
docker compose -f compose.toolchain.yml run --rm otsniff help
docker compose -f compose.toolchain.yml run --rm otsniff scan:secrets       --target /app/data --out /app/data/findings.json --asset a_eng_01
docker compose -f compose.toolchain.yml run --rm otsniff scan:supply-chain  --target /app --out /app/data/sc.json --asset a_eng_01
docker compose -f compose.toolchain.yml run --rm otsniff merge              --plant /app/data/plant-demo.json --findings /app/data/findings.json --out /app/data/plant-enriched.json
```

On Windows/Git-Bash, prefix commands containing `/app/...` paths with `MSYS_NO_PATHCONV=1` so Docker arg paths aren't translated.

## Architecture

### Two-tier runtime with a module-system boundary

- **Web tier** (CommonJS): `netlify/functions/*.js`, shared in `netlify/functions/_shared/{data,scoring,simulation}.js`. Stateless handlers consume a plant fixture from disk.
- **Toolchain tier** (ESM): `scripts/otsniff/**/*.mjs`. Produces normalized findings that merge back into the web tier's fixture. CLI entrypoint is `scripts/otsniff/cli.mjs`.
- When something is genuinely shared across both tiers (e.g. severity vocabulary), dual-publish it rather than cross-importing.

### Data flow

```
scanner (.mjs, Docker)  →  findings.json (normalized schema)
                           ↓ otsniff merge
                           data/plant-enriched.json  ← loadPlantData() prefers this over plant-demo.json
                           ↓
                           _shared/{scoring,simulation}.js → Netlify functions → web/js/api.js → web/*.html
```

`netlify/functions/_shared/data.js:resolveDataFile()` auto-swaps to `data/plant-enriched.json` when it exists; override with `OTSNIFF_PLANT_FILE`.

### Normalized finding schema (the contract)

Every scanner emits the same shape, defined + validated in `scripts/otsniff/schema.mjs`:

```
{ finding_id, asset_id, finding_type, severity, evidence, source_tool, detected_at, confidence }
```

`finding_type ∈ {secret_leak, supply_chain, mesh_gap, validated_creds, exposure}`. `scripts/otsniff/merge.mjs:mergeFindings()` is idempotent — it dedupes by `finding_id` on both `vulnerabilities[]` and `evidence_findings[]`. Accepts a `{ now }` injectable for deterministic tests.

### Scanner pattern

Each scanner in `scripts/otsniff/scanners/*.mjs` exposes a single async function that:
1. Tries a Docker-based upstream tool (image via `OTSNIFF_<TOOL>_IMAGE` env).
2. Falls back to a built-in regex/YAML-pattern scan so CI stays runnable without Docker.
3. Tags the fallback path with `source_tool: "manual"` so provenance is never misrepresented.
4. Redacts secrets before emitting evidence (`redact()` in `secrets.mjs`, never the raw match).

When adding a new scanner, do not copy the whole structure a fourth time — extract a `scripts/otsniff/scanners/_base.mjs` with the shared `run()`, `walk()`, `toFinding()` helpers first.

### Dev server API routing

`scripts/dev-server.mjs` mirrors `netlify.toml` redirects via a route table and `createRequire`-loads each CJS function on demand. When adding a new Netlify function, add both a `netlify.toml` redirect **and** a row to `apiRoutes` in `dev-server.mjs` — the dev server is not auto-derived from `netlify.toml`.

### UI stack

Plain HTML + vanilla ES modules + a single `web/css/styles.css` design system. Brand is Malkan Solutions (cyan `#0AA2C0` on white, Inter + Poppins + JetBrains Mono). Motion follows Emil Kowalski's rules — strong `cubic-bezier(0.23,1,0.32,1)` ease-out, `scale(0.97)` on `:active`, `prefers-reduced-motion` respected, hover effects gated behind `@media (hover:hover) and (pointer:fine)`.

### Guardrails

- Active/lab-only scanners (future: trident, purple-team) must gate behind `LAB_MODE=1` and never be invoked from Netlify Functions.
- Scanners accept CLI flags as trusted values (local-operator threat model). Do not add web-facing entrypoints that pass user input into scanner args without re-scoping the threat model.
- Reject `evidence_findings` entries whose `asset_id` isn't in `plant.assets[]` (merge already does this).

## Project-level documents

Service-offering, SOW, and roadmap live outside the repo at `G:\My Drive\Ghar Files\4. B2 Docs\Tech Projects\Idea91 OTSniffer`. Weekly milestones and pipeline stages (`01_Opportunity`, `02_Validation`, `03_Viable Concept`) are maintained there — use the `b2-tech-project-analysis-pipeline` skill when refreshing them.
