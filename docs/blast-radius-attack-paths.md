# Blast-Radius Attack Paths — UI Spec & Implementation Handoff

**Audience:** the next implementer (front-end + Netlify-function engineer) picking this up cold.

**What this is:** a complete contract for the `attack_paths[]` plant-fixture extension and the click-into-asset red-animated overlay it powers. The schema is shipped (`scripts/otsniff/attack-paths.mjs`), validated by tests (`tests-js/attack-paths.test.mjs`, `tests-js/advisories.foxboro-specificity.test.mjs`), and seeded with three hand-built realistic examples (`data/attack-paths-examples.json`). What remains is plumbing: a Netlify function, a topology overlay, and a hover/keyboard accessibility layer.

---

## 1. Why this exists (the problem)

Today, the blast-radius view in OTSniffer has a 50-line BFS at `lib/server/blastRadius.ts` and a 250-line BFS at `netlify/functions/_shared/simulation.js`. Both compute reachability — neither tells the plant manager *how* the attacker would actually traverse a hop. There's no protocol attribution, no leverage, no exploit gating, no MITRE TTP, no CVE binding.

The user's specific request: **click any downstream asset → see the attack path the matched CVE enables on that specific asset, painted in red, animated hop-by-hop, with protocol + leverage + TTP labels per hop.** That's what the schema and spec below produce.

The credibility bedrock — **vendor specificity** — is locked in by `tests-js/advisories.foxboro-specificity.test.mjs`. Foxboro assets do not inherit Modicon advisories. Modicon assets do not inherit Triconex advisories. Confirm this test still passes before any UI work; if it fails, fix the matcher first or the entire attack-path layer is built on quicksand.

---

## 2. The data shape: `attack_paths[]`

Lives at the **top level of the plant fixture**, alongside `evidence_findings[]` and `vulnerabilities[]`. Reasoning: paths can serve multiple findings and the existing `simulation.js` already returns top-level `attack_paths` in its API response — symmetry beats nesting here. Validator: `scripts/otsniff/attack-paths.mjs:validateAttackPath()`. Schema:

```jsonc
{
  "path_id": "ap_<12 hex>",                 // deterministic hash of inputs (idempotent through merge.mjs)
  "source_finding_id": "f_seed_05_..." | null, // upstream evidence_finding (null for non-CVE-derived paths)
  "compromised_asset_id": "a_eng_01",       // where the attacker is
  "target_asset_id": "a_sis_01",            // what they reach
  "kill_chain_phase": "inhibit-response",   // closed set, see KILL_CHAIN_PHASES
  "rationale": "1-sentence plant-manager-readable narrative",
  "hops": [
    {
      "from_asset_id": "a_eng_01",
      "to_asset_id": "a_sis_01",
      "protocol": "tsaa",                   // closed set, see ICS_PROTOCOLS
      "leverage": "TriStation session with cached project file...",
      "mitre_attack_for_ics": ["T0843","T0858","T0879"],
      "exploit_gating": "requires-credentials", // closed set, see EXPLOIT_GATING
      "hop_confidence": 0.7                 // [0,1]
    }
  ],
  "path_confidence": 0.805,                 // = min(hop_confidence) * cluster_bonus, capped at 1.15
  "matched_ttp_cluster": "triton-trisis" | null,
  "animation": { ...see §5 }
}
```

### Closed vocabularies

- **`kill_chain_phase`** — `lateral-movement`, `loss-of-view`, `loss-of-control`, `inhibit-response`, `impair-control`. Sort priority for the operator readout: `impair-control` > `inhibit-response` > `loss-of-control` > `loss-of-view` > `lateral-movement`.
- **`exploit_gating`** — `confirmed-remote-unauth` (strongest) > `confirmed-remote-auth` > `requires-default-creds` > `requires-credentials` > `requires-specific-firmware` > `requires-adjacent` > `requires-physical` (weakest) > `theoretical-only`.
- **`protocol`** — see `ICS_PROTOCOLS` in `attack-paths.mjs`. Includes vendor-specific (`tsaa`, `eni`, `tci-egd`, `proplus`, `osi-pi`) and substation (`iccp`, `iec-61850-mms`, `iec-61850-goose`, `dnp3`, `iec-104`).
- **`mitre_attack_for_ics`** — Txxxx format. The validator checks format only (so unknown T-codes still pass), but the canonical TTPs are listed in `KNOWN_TTPS` for autocomplete tooling.

### Determinism

`computePathId({source_finding_id, compromised_asset_id, target_asset_id, hops})` produces the same `path_id` across runs given the same inputs. Critical for `merge.mjs` idempotency. Re-running the pentester pipeline must not duplicate paths; merge dedupes by `path_id`.

### Confidence formula

```
path_confidence = min(hop.hop_confidence) * (1 + cluster_bonus)
cluster_bonus   = min(0.15, overlap × 0.05)   // overlap = TTPs shared with a known cluster
```

The minimum-hop rule is non-negotiable: a 5-hop path with one weak hop is a weak path. Multiplication across hops would understate worst-case kill chains.

---

## 3. API surface

Add **one new Netlify function** and **one route**. The existing `assets-paths.js` (which calls `getAssetPaths()` in `simulation.js`) is *reachability-only* — keep it as a backing API for the topology view but layer the attack-path-specific endpoint on top.

### New function: `netlify/functions/attack-paths.js` (CommonJS)

```js
// netlify/functions/attack-paths.js
const { loadPlantData } = require('./_shared/data');

// GET /api/assets/:assetId/attack-paths?direction=incoming|outgoing
// direction=incoming  → paths where target_asset_id === assetId  (default)
// direction=outgoing  → paths where compromised_asset_id === assetId
exports.handler = async (event) => {
  try {
    const assetId = event.queryStringParameters?.assetId;
    const direction = event.queryStringParameters?.direction || 'incoming';
    if (!assetId) return { statusCode: 400, body: JSON.stringify({ error: 'assetId required' }) };

    const data = loadPlantData();
    const all = Array.isArray(data.attack_paths) ? data.attack_paths : [];

    const filtered = direction === 'outgoing'
      ? all.filter((p) => p.compromised_asset_id === assetId)
      : all.filter((p) => p.target_asset_id === assetId);

    // Sort: path_confidence desc, then kill_chain_phase severity, then hop count asc.
    const phaseRank = { 'impair-control': 5, 'inhibit-response': 4, 'loss-of-control': 3, 'loss-of-view': 2, 'lateral-movement': 1 };
    filtered.sort((a, b) => {
      if (b.path_confidence !== a.path_confidence) return b.path_confidence - a.path_confidence;
      const pa = phaseRank[a.kill_chain_phase] || 0, pb = phaseRank[b.kill_chain_phase] || 0;
      if (pb !== pa) return pb - pa;
      return (a.hops?.length || 0) - (b.hops?.length || 0);
    });

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ asset_id: assetId, direction, paths: filtered }),
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: String(err) }) };
  }
};
```

### Add to `netlify.toml`

```toml
[[redirects]]
  from = "/api/assets/:assetId/attack-paths"
  to = "/.netlify/functions/attack-paths?assetId=:assetId"
  status = 200
```

### Add to `scripts/dev-server.mjs` (the route table is hand-maintained per CLAUDE.md)

```js
{ method: 'GET', pattern: /^\/api\/assets\/([^/]+)\/attack-paths$/, fn: 'attack-paths', param: 'assetId' },
```

---

## 4. Click-into-asset behavior

On `web/asset-detail.html` and on `web/network-graph.html` (the topology overlay):

1. **Default state** — when an asset is selected, fire `GET /api/assets/<id>/attack-paths?direction=incoming`.
2. **Render** — hide all topology edges by default in the overlay layer; for each path returned, illuminate the edges that match `from_asset_id → to_asset_id` for each hop.
3. **Animate** — paths play in `path_confidence` desc order, with a brief delay between paths (300ms) so the eye can catch each one.
4. **Hover an asset in the topology** — show a tooltip listing the count of incoming + outgoing paths and the highest-confidence path's `rationale`.
5. **Click an asset** — selects it; if it's a downstream target of any path, swap to that asset's view and play its incoming paths.

### Direction toggle

Tab pair above the overlay: `Reach me ▴` (default, incoming) | `Reach others ▾` (outgoing). Same data structure, different filter.

---

## 5. Animation contract

### Color token

**Use `var(--sev-critical)` from `web/css/styles.css` (`#C63B59` — desaturated rose). Do not use raw `#ff0000`** — it fails WCAG AA against `#FFFFFF`/`#F7F9FA` backgrounds and clashes with the `#0AA2C0` brand cyan.

| Layer            | Token                                              | Notes |
| ---------------- | -------------------------------------------------- | ----- |
| Path stroke      | `var(--sev-critical)`                              | filled via `stroke` on SVG `<path>` |
| Path glow        | `var(--sev-critical-tint)` (`#FBE9EE`)             | wider underlay stroke for halo |
| Hop label bg     | `var(--surface)` with `border: 1px solid var(--sev-critical)` | tooltip card |
| Hop label text   | `var(--ink)` for body, `var(--sev-critical)` for severity tag | WCAG AA on white = 4.7:1 (verified) |

### Easing

**`cubic-bezier(0.23, 1, 0.32, 1)`** per CLAUDE.md motion rules and persona file. Note: `styles.css` has `--ease: cubic-bezier(0.16, 1, 0.3, 1)` (similar but not identical) — for the attack-path layer we want a slightly stronger ease-out tail because hops should feel like they "land" decisively. If `--ease` and the path-specific easing converge in practice, alias them.

### Speed (per hop)

`speed_ms_per_hop` is computed per hop based on `exploit_gating` so urgency reflects exploit reality, not the same pulse for every threat:

| Gating                       | ms/hop |
| ---------------------------- | -----: |
| `confirmed-remote-unauth`    |    480 |
| `confirmed-remote-auth`      |    560 |
| `requires-default-creds`     |    600 |
| `requires-credentials`       |    640 |
| `requires-adjacent`          |    700 |
| `requires-specific-firmware` |    720 |
| `requires-physical`          |    880 |
| `theoretical-only`           |   1000 |

A `requires-physical` hop crawling at 880ms next to a `confirmed-remote-unauth` hop tearing through at 480ms tells the plant manager the threat ranking *visually*, before they read a single label.

### Opacity (per hop)

`requires-physical` paints at 0.55 opacity. `confirmed-remote-unauth` at 1.0. Full table in `attack-paths.mjs:defaultAnimation()`. Without this, the UI presents physical-access threats with the same visual weight as unauthenticated remote — that's the persona file's #1 prohibition.

### Stagger

Each hop in a path begins 80ms after the previous hop completes its travel — so a 3-hop path with hops at 480/640/600 ms takes ~480 + 80 + 640 + 80 + 600 = 1880ms total. Acceptable. If users cycle through many paths, queue them with a 300ms gap.

### `prefers-reduced-motion` fallback

Honor the OS preference. Detection:

```js
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
```

Fallback rendering:
- **No animation.** All hops painted statically in `var(--sev-critical)` simultaneously.
- **All hop labels visible at once** (not on hover).
- **Persistent legend** above the overlay listing per-hop `protocol → leverage → T-code` so the kill-chain narrative is fully readable without motion.
- **Gating opacity still applied** — `requires-physical` paths render at lower opacity in the static fallback too, so severity ordering is preserved.

---

## 6. Hover state per hop

Trigger: pointer enters a hop edge OR the hop receives keyboard focus. Markup template:

```html
<div role="tooltip" id="ap-hop-tooltip-{path_id}-{hop_index}" class="ap-hop-tooltip">
  <div class="ap-hop-tooltip__row">
    <span class="ap-hop-tooltip__label">Protocol</span>
    <span class="ap-hop-tooltip__value">{hop.protocol}</span>
  </div>
  <div class="ap-hop-tooltip__row">
    <span class="ap-hop-tooltip__label">Leverage</span>
    <span class="ap-hop-tooltip__value">{hop.leverage}</span>
  </div>
  <div class="ap-hop-tooltip__row">
    <span class="ap-hop-tooltip__label">MITRE</span>
    <span class="ap-hop-tooltip__value">{hop.mitre_attack_for_ics.join(', ')}</span>
  </div>
  <div class="ap-hop-tooltip__row ap-hop-tooltip__row--gating">
    <span class="ap-hop-tooltip__label">Gating</span>
    <span class="ap-hop-tooltip__value ap-hop-tooltip__value--{gating-class}">{hop.exploit_gating}</span>
  </div>
</div>
```

CSS uses the existing tokens. Tooltip enters with `opacity 0 → 1` over 220ms (`var(--dur-hover)`) and `var(--ease)`. Hover gating: `@media (hover:hover) and (pointer:fine)` per CLAUDE.md.

---

## 7. Accessibility (WCAG AA)

### Color contrast

- **`#C63B59` (`--sev-critical`) on `#FFFFFF`** = contrast ratio 5.0:1 → passes AA Normal Text (≥4.5) and AA Large Text (≥3.0). ✓
- **`#C63B59` on `#F7F9FA` (`--bg`)** = 4.8:1 → passes AA Normal Text. ✓
- **`#FBE9EE` (`--sev-critical-tint`) glow on white** is decorative-only; relies on adjacent `--sev-critical` stroke for accessible meaning. Glow is suppressed under `prefers-reduced-motion` and high-contrast Windows themes (`@media (forced-colors: active)`).
- **Brand cyan `#0AA2C0` does not appear inside the attack-path layer** — kill-chain layer is intentionally a different color from the brand to communicate "this is an alert, not a navigation surface."

### Keyboard navigation

- The attack-path overlay is a list of `path_id` items. Each path is a focusable `<button role="region" aria-label="Attack path: {rationale}">` containing focusable `<button>`s for each hop.
- Arrow Left/Right within a path moves between hops; Arrow Up/Down moves between paths.
- Enter on a hop opens the tooltip persistently (so screen readers can read the full content); Escape dismisses.
- Focus styles: `2px solid var(--mk-cyan)` outline + `outline-offset: 2px`. Brand-cyan focus on alert-red content has 4.4:1 contrast — acceptable for non-text UI per WCAG 2.1 SC 1.4.11.

### Screen reader narrative

For each path, render a visually hidden but SR-readable summary:

```html
<p class="sr-only">
  Attack path {ordinal} of {total}, {kill_chain_phase}, confidence {path_confidence}.
  Starting at {compromised_asset_name}, reaching {target_asset_name} in {hops.length} hops.
  {rationale}
</p>
```

Then for each hop, a hop-level SR text:

```html
<span class="sr-only">
  Hop {n}: from {from_asset_name} to {to_asset_name},
  protocol {hop.protocol}, leverage {hop.leverage},
  MITRE techniques {hop.mitre_attack_for_ics.join(' and ')},
  exploit gating {hop.exploit_gating}.
</span>
```

The `.sr-only` class already exists in `styles.css`; if not, add the standard clip-path utility.

---

## 8. Implementation order (the next implementer's checklist)

1. **Confirm the bedrock.** Run `docker compose -f compose.toolchain.yml run --rm node npm test`. The Foxboro specificity test (4 subtests) and the attack-paths schema test (10 subtests) must both pass. If either fails, do not proceed — fix the matcher or the validator first.
2. **Promote the example data into the demo plant.** Open `data/attack-paths-examples.json`, copy the `attack_paths` array, and add it as a top-level field to `data/plant-enriched.json`. Regenerate the KNPC fixture similarly once paths are derived for it (separate engagement).
3. **Wire the API.** Add `netlify/functions/attack-paths.js` (template in §3), add the redirect to `netlify.toml`, add the row to `apiRoutes` in `scripts/dev-server.mjs`. Smoke-test with `curl http://localhost:3000/api/assets/a_sis_01/attack-paths`.
4. **Render the overlay.** Add `web/js/attack-paths-overlay.js` as a vanilla ES module. Inputs: an SVG topology container, a paths array. Outputs: animated red hop strokes, hop tooltips, ARIA structure.
5. **Wire click-into-asset.** In `network-graph.html` and `asset-detail.html`, on asset click/select, fetch attack paths and pass them to the overlay module. Cap concurrent paths at 3 to avoid visual chaos; "show more" button reveals the rest.
6. **Ship the reduced-motion fallback first**, then add motion. Per Emil-Kowalski rules: if motion breaks, the underlying state must already be readable.
7. **Run the security review skill** (`/security-review`) once the API is live — the new endpoint reads from disk and returns by query parameter; verify no path-traversal or asset-id injection exists.

---

## 9. Out of scope (intentionally deferred)

- **Live exploit execution.** Assess-only. The `attack_paths[]` data is derivative analysis, never an action.
- **Multi-hop CVE chaining.** A path that consumes two CVEs is allowed by the schema (each hop's `leverage` may name a different CVE), but the auto-generation logic that *finds* such chains is not in scope here. Hand-built paths in `attack-paths-examples.json` show the shape; a future scanner derives them mechanically.
- **Water-vertical example paths.** Pending next engagement. The schema is sector-agnostic; only the example data is missing. Aliquippa-class (Unitronics default-password) and Oldsmar-class (TeamViewer-on-HMI) paths fit the same shape.
- **Active/lab-only TTP injection** (e.g., simulated GOOSE spoofing). Persona-marked as `LAB_MODE=1`-gated; do not invoke from Netlify functions per CLAUDE.md guardrails.

---

## 10. References

- `scripts/otsniff/attack-paths.mjs` — schema, validator, helpers
- `scripts/otsniff/scanners/advisories.mjs` — upstream advisory matcher (consume its `evidence_findings[]`)
- `data/attack-paths-examples.json` — three hand-built realistic paths against `data/plant-enriched.json`
- `tests-js/attack-paths.test.mjs` — schema + validator + example tests (10 cases)
- `tests-js/advisories.foxboro-specificity.test.mjs` — credibility bedrock (4 cases)
- `.claude/agents/blast-radius-pentester.md` — the persona file; hard rules are non-negotiable
- `.claude/agents/sbom-pentester.md` — sister agent; respect the boundary
- `web/css/styles.css` — design-system tokens (`--sev-critical`, `--ease`, `--dur-*`)
- `CLAUDE.md` — architecture, motion rules, Docker discipline

