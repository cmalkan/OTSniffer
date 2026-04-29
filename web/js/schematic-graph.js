// OTSniffer schematic graph renderer.
// Hand-rolled SVG. Lays out the plant fixture against the Purdue Reference
// Model — Levels are horizontal bands (L3.5 OT DMZ at top, L1 process at
// bottom). Zones are columns within their level band. Assets are cards
// stacked inside zones. Edges are orthogonal-routed between cards with
// protocol/port labels and an animated data pulse for the highlighted edge.
//
// Single export: renderSchematic(svg, graph, options) where graph is the
// payload from /api/graph. Returns a controller with select(), highlight(),
// reset() methods.

const SVG_NS = "http://www.w3.org/2000/svg";

// Purdue band heights and ordering. Higher numeric level appears at top.
// Each level has a band; zones inside the same level share that band.
const PURDUE_BANDS = [
  { level: 3.5, label: "L3.5 — OT DMZ",                tone: "dmz" },
  { level: 3,   label: "L3 — Operations / Control",     tone: "ops" },
  { level: 2,   label: "L2 — Supervisory / HMI",        tone: "supervisory" },
  { level: 1,   label: "L1 — Basic Control",            tone: "control" },
  { level: 0,   label: "L0 — Field / Process",          tone: "field" },
];

const TYPE_GLYPH = {
  "scada-server":            "scada",
  "historian":               "histn",
  "hmi":                     "hmi",
  "engineering-workstation": "ewks",
  "plc":                     "plc",
  "safety-controller":       "sis",
  "rtu":                     "rtu",
};

const PROTO_LABEL = {
  "modbus-tcp":  "Modbus TCP / 502",
  "ethernet-ip": "EIP CIP / 44818",
  "s7":          "S7comm / 102",
  "dnp3":        "DNP3 / 20000",
  "profinet":    "PROFINET / 34964",
  "opc-ua":      "OPC UA / 4840",
  "https":       "HTTPS / 443",
  "http":        "HTTP / 80",
};

export function renderSchematic(svg, graph, options = {}) {
  const onSelect = options.onSelect || (() => {});
  const onHighlight = options.onHighlight || (() => {});

  // Clear any prior render
  while (svg.firstChild) svg.removeChild(svg.firstChild);

  // Geometry — assets stack VERTICALLY inside each zone (length-wise),
  // so zones become tall narrow columns. This reads better than the
  // wide-row layout when a single zone has many assets (KNPC has 30+
  // firewalls in one zone).
  const ASSET_W = 220;
  const ASSET_H = 92;
  const ASSET_GAP_Y = 14;
  const ZONE_PAD_TOP = 36;     // extra top room so the inside zone label clears the first asset card
  const ZONE_PAD = 22;         // bottom + side padding inside the zone box
  const ZONE_GAP = 36;
  const BAND_LABEL_W = 150;
  const BAND_PAD_TOP = 44;
  const BAND_PAD_BOTTOM = 28;
  const PADDING_X = BAND_LABEL_W + 36;
  const PADDING_TOP = 80;
  const MAX_ASSETS_PER_COLUMN = 12; // wrap to a new column inside the zone after this many

  // 1) Group zones by Purdue level
  const zonesByLevel = new Map();
  for (const z of graph.zones) {
    const lvl = parseLevel(z.level);
    if (lvl == null) continue;
    if (!zonesByLevel.has(lvl)) zonesByLevel.set(lvl, []);
    zonesByLevel.get(lvl).push(z);
  }

  // 2) Determine visible bands (only bands that have at least one zone)
  const presentBands = PURDUE_BANDS.filter((b) => zonesByLevel.has(b.level));

  // 3) Group assets by zone, lay out asset cards within each zone
  const assetsByZone = new Map();
  for (const a of graph.assets) {
    if (!assetsByZone.has(a.zone_id)) assetsByZone.set(a.zone_id, []);
    assetsByZone.get(a.zone_id).push(a);
  }

  // For each band, compute zones x asset positions.
  // Band height is determined by tallest zone (count of assets stacked).
  let cursorY = PADDING_TOP;
  const bandLayouts = [];
  let maxRightX = PADDING_X;

  for (const band of presentBands) {
    const zonesInBand = zonesByLevel.get(band.level);
    let cursorX = PADDING_X;
    const zoneLayouts = [];
    let maxAssetsInBand = 1;

    for (const z of zonesInBand) {
      const assets = assetsByZone.get(z.zone_id) || [];
      const count = Math.max(1, assets.length);
      // Wrap to multiple columns ONLY when a zone has more than
      // MAX_ASSETS_PER_COLUMN assets. Otherwise it's a single tall column.
      const cols = Math.max(1, Math.ceil(count / MAX_ASSETS_PER_COLUMN));
      const rows = Math.min(MAX_ASSETS_PER_COLUMN, Math.ceil(count / cols));
      const zoneWidth = cols * ASSET_W + (cols - 1) * 18 + 2 * ZONE_PAD;
      const zoneInnerHeight = rows * ASSET_H + (rows - 1) * ASSET_GAP_Y;

      const assetCoords = assets.map((a, i) => {
        const col = Math.floor(i / rows);
        const row = i % rows;
        return {
          asset: a,
          x: cursorX + ZONE_PAD + col * (ASSET_W + 18),
          row, col,
        };
      });

      zoneLayouts.push({
        zone: z,
        x: cursorX,
        width: zoneWidth,
        innerHeight: zoneInnerHeight,
        assets: assetCoords,
      });

      cursorX += zoneWidth + ZONE_GAP;
      maxAssetsInBand = Math.max(maxAssetsInBand, rows);
    }

    // Band height = tallest zone's column height + zone padding + band chrome.
    // Top pad reserved for the inside zone label.
    const tallestInner = Math.max(...zoneLayouts.map(zl => zl.innerHeight), ASSET_H);
    const bandHeight = tallestInner + ZONE_PAD_TOP + ZONE_PAD + BAND_PAD_TOP + BAND_PAD_BOTTOM;
    // Equalize zone box heights across the band so they line up visually
    for (const zl of zoneLayouts) {
      zl.innerHeight = tallestInner;
      for (const ac of zl.assets) {
        ac.y = cursorY + BAND_PAD_TOP + ZONE_PAD_TOP + ac.row * (ASSET_H + ASSET_GAP_Y);
      }
    }

    bandLayouts.push({
      band,
      y: cursorY,
      height: bandHeight,
      zones: zoneLayouts,
    });

    maxRightX = Math.max(maxRightX, cursorX);
    cursorY += bandHeight;
  }

  const totalWidth = Math.max(maxRightX, 1100);
  const totalHeight = cursorY + 40;

  svg.setAttribute("viewBox", `0 0 ${totalWidth} ${totalHeight}`);
  svg.setAttribute("preserveAspectRatio", "xMidYMid meet");

  // ── Defs: arrow marker, glow filter
  const defs = el("defs");
  defs.appendChild(arrowMarker("arrow-default", "rgba(91, 215, 233, 0.55)"));
  defs.appendChild(arrowMarker("arrow-bright", "#5BD7E9"));
  defs.appendChild(arrowMarker("arrow-warn", "#FF7E47"));
  svg.appendChild(defs);

  // ── Render Purdue band labels + horizontal divider lines
  for (const bl of bandLayouts) {
    // Divider line at top of each band (except the first)
    if (bl !== bandLayouts[0]) {
      const div = el("line", {
        x1: 16, x2: totalWidth - 16,
        y1: bl.y, y2: bl.y,
        stroke: "rgba(132, 151, 182, 0.10)",
        "stroke-width": 1,
        "stroke-dasharray": "1 6",
      });
      svg.appendChild(div);
    }
    // Band label, "PURDUE LEVEL X" anchored to the left edge of the band
    const labelGroup = el("g", { transform: `translate(${BAND_LABEL_W - 26}, ${bl.y + bl.height / 2})` });
    const labelText = el("text", {
      class: "zone-level",
      "text-anchor": "end",
      x: 0, y: 0,
      "dominant-baseline": "middle",
      "font-size": "12",
      "font-weight": "500",
      "letter-spacing": "0.14em",
      style: "text-transform:uppercase",
    });
    labelText.textContent = bl.band.label.toUpperCase();
    labelGroup.appendChild(labelText);
    svg.appendChild(labelGroup);

    // Faint band fill — alternating rows for visual rhythm
    const idx = bandLayouts.indexOf(bl);
    if (idx % 2 === 0) {
      const fill = el("rect", {
        x: BAND_LABEL_W,
        y: bl.y,
        width: totalWidth - BAND_LABEL_W - 8,
        height: bl.height,
        fill: "rgba(132, 151, 182, 0.018)",
        stroke: "none",
      });
      svg.appendChild(fill);
    }
  }

  // ── Render zones
  for (const bl of bandLayouts) {
    for (const zl of bl.zones) {
      const zoneRect = el("rect", {
        class: "zone-rect",
        x: zl.x,
        y: bl.y + BAND_PAD_TOP,
        width: zl.width,
        height: zl.innerHeight + ZONE_PAD_TOP + ZONE_PAD,
        rx: 14, ry: 14,
      });
      svg.appendChild(zoneRect);

      // Zone label sits INSIDE the zone box at the top, with a translucent
      // pill behind it. This keeps multiple narrow adjacent zones from
      // overlapping their labels — each label is bounded by its zone width.
      const labelMaxWidth = zl.width - 28;
      const labelText = truncateToFit(zl.zone.name || zl.zone.zone_id, labelMaxWidth, 12);
      const pillW = Math.min(labelMaxWidth, labelText.length * 7 + 14);
      const pillH = 18;
      const pillX = zl.x + 12;
      const pillY = bl.y + BAND_PAD_TOP + 8;
      svg.appendChild(el("rect", {
        x: pillX, y: pillY,
        width: pillW, height: pillH,
        rx: 4, ry: 4,
        fill: "rgba(255, 255, 255, 0.86)",
        stroke: "rgba(132, 151, 182, 0.18)",
        "stroke-width": 0.5,
      }));
      const zoneLabel = el("text", {
        class: "zone-label",
        x: pillX + 7,
        y: pillY + 12,
      });
      zoneLabel.textContent = labelText;
      const titleEl = el("title");
      titleEl.textContent = `${zl.zone.zone_id} · ${zl.zone.name}${zl.zone.level ? ' · ' + zl.zone.level : ''}`;
      zoneLabel.appendChild(titleEl);
      svg.appendChild(zoneLabel);
    }
  }

  // ── Build asset position lookup for edge routing
  const assetPos = new Map();
  for (const bl of bandLayouts) {
    for (const zl of bl.zones) {
      for (const ac of zl.assets) {
        assetPos.set(ac.asset.asset_id, {
          x: ac.x, y: ac.y, w: ASSET_W, h: ASSET_H,
        });
      }
    }
  }

  // ── Render edges (connectivity) BEFORE asset cards so cards sit on top
  const edgeLayer = el("g", { class: "edge-layer" });
  svg.appendChild(edgeLayer);

  // Merge declared + inferred connectivity. Inferred edges only render when
  // the graph signaled inference_active (sparse declared connectivity), or
  // when the consumer passes options.showInferred = true.
  const allEdges = (graph.connectivity || []).map(c => ({ ...c, _inferred: false }));
  const showInferred = options.showInferred ?? graph.inference_active ?? false;
  if (showInferred && Array.isArray(graph.inferred_connectivity)) {
    for (const c of graph.inferred_connectivity) allEdges.push(c);
  }

  const edgeIndex = new Map(); // edgeId -> { groupEl, pathEl }
  for (const c of allEdges) {
    const a = assetPos.get(c.source_asset_id);
    const b = assetPos.get(c.target_asset_id);
    if (!a || !b) continue;
    const edgeId = `${c.source_asset_id}|${c.target_asset_id}|${c.protocol}|${c.port}`;
    const inferredCls = c._inferred ? " is-inferred" : "";
    const group = el("g", { class: `edge-group${inferredCls}`, "data-edge": edgeId });
    if (c._reason) {
      const t = el("title");
      t.textContent = `${c._inferred ? '[inferred] ' : ''}${c._reason || ''}\n${c.source_asset_id} → ${c.target_asset_id} · ${c.protocol}/${c.port}`;
      group.appendChild(t);
    }
    const trustClass = c.trust_level === "low" ? "is-untrusted" :
                       c.trust_level === "medium" ? "is-medium" : "";
    const d = orthogonalPath(a, b);
    const path = el("path", {
      class: `edge-line ${trustClass}${inferredCls}`,
      d,
      "marker-end":
        c.trust_level === "low" ? "url(#arrow-warn)" :
        c.trust_level === "medium" ? "url(#arrow-bright)" :
        "url(#arrow-default)",
    });
    group.appendChild(path);

    // Edge label rendered at midpoint — skip for inferred edges to keep the
    // diagram readable when many fan-out conduits overlap.
    if (!c._inferred) {
      const mid = midPointOnPath(a, b);
      const label = el("text", {
        class: "edge-label",
        x: mid.x, y: mid.y - 4,
        "text-anchor": "middle",
      });
      label.textContent = PROTO_LABEL[c.protocol] || c.protocol;
      group.appendChild(label);
    }

    edgeLayer.appendChild(group);
    edgeIndex.set(edgeId, { group, path });
  }

  // ── Render asset cards
  const cardLayer = el("g", { class: "card-layer" });
  svg.appendChild(cardLayer);

  const cardIndex = new Map();
  for (const bl of bandLayouts) {
    for (const zl of bl.zones) {
      for (const ac of zl.assets) {
        const a = ac.asset;
        const findings = (graph.findings_by_asset && graph.findings_by_asset[a.asset_id]) || [];
        const sevs = severityCounts(findings);

        const g = el("g", {
          class: "asset-group",
          "data-asset": a.asset_id,
          transform: `translate(${ac.x}, ${ac.y})`,
        });

        // Card body
        const card = el("rect", {
          class: "asset-card",
          x: 0, y: 0, width: ASSET_W, height: ASSET_H,
          rx: 10, ry: 10,
        });
        g.appendChild(card);

        // Top stripe — colored by criticality
        const stripeColor =
          a.criticality_score >= 9 ? "#E66B7E" :
          a.criticality_score >= 7 ? "#DEB35A" : "#0AA2C0";
        const stripe = el("rect", {
          x: 0, y: 0, width: ASSET_W, height: 3,
          fill: stripeColor,
          opacity: 0.7,
        });
        g.appendChild(stripe);

        // Asset ID + type glyph
        const idText = el("text", {
          class: "asset-id",
          x: 16, y: 24,
        });
        idText.textContent = `${a.asset_id} · ${TYPE_GLYPH[a.asset_type] || a.asset_type}`;
        g.appendChild(idText);

        // Asset name
        const nameText = el("text", {
          class: "asset-name",
          x: 16, y: 47,
        });
        nameText.textContent = truncate(a.name, 26);
        g.appendChild(nameText);

        // Vendor / model
        const vendorText = el("text", {
          class: "asset-vendor",
          x: 16, y: 67,
        });
        vendorText.textContent = truncate(`${a.vendor} ${a.model}`, 32);
        g.appendChild(vendorText);

        // Criticality + IP at bottom
        const metaText = el("text", {
          class: "asset-meta",
          x: 16, y: 88,
        });
        metaText.textContent = `crit ${a.criticality_score}  ·  ${a.ip_address || "—"}`;
        g.appendChild(metaText);

        // Severity dots — top right cluster
        let dotX = ASSET_W - 18;
        const dotY = 18;
        const sevOrder = ["critical", "high", "medium", "low"];
        for (const sev of sevOrder) {
          const count = sevs[sev] || 0;
          if (!count) continue;
          const dot = el("circle", {
            class: `severity-dot sev-${sev}`,
            cx: dotX, cy: dotY, r: 5,
          });
          g.appendChild(dot);
          if (count > 1) {
            const sevColor = { critical: "#E66B7E", high: "#E89060", medium: "#DEB35A", low: "#7CCDA0" }[sev] || "#94A6C2";
            const cnt = el("text", {
              x: dotX, y: dotY + 18,
              "text-anchor": "middle",
              fill: sevColor,
              "font-size": 11,
              "font-weight": 700,
            });
            cnt.textContent = count;
            g.appendChild(cnt);
          }
          dotX -= 16;
        }

        // Click handler
        g.addEventListener("click", (ev) => {
          ev.stopPropagation();
          select(a.asset_id);
        });

        cardLayer.appendChild(g);
        cardIndex.set(a.asset_id, { group: g, asset: a });
      }
    }
  }

  // ── Animated data pulse — when an edge is highlighted, animate a small dot
  let pulseAnimId = null;
  function startPulse(edgeId) {
    stopPulse();
    const idx = edgeIndex.get(edgeId);
    if (!idx) return;
    const path = idx.path;
    const pulse = el("circle", { class: "edge-pulse", r: 3.5, cx: 0, cy: 0 });
    edgeLayer.appendChild(pulse);
    const length = path.getTotalLength();
    const start = performance.now();
    const dur = 1800;
    function tick(t) {
      const elapsed = (t - start) % dur;
      const p = elapsed / dur;
      const pt = path.getPointAtLength(length * p);
      pulse.setAttribute("cx", pt.x);
      pulse.setAttribute("cy", pt.y);
      pulse.setAttribute("opacity", String(0.85 - 0.4 * Math.abs(p - 0.5)));
      pulseAnimId = requestAnimationFrame(tick);
    }
    pulseAnimId = requestAnimationFrame(tick);
    pulse.dataset.pulse = "1";
  }
  function stopPulse() {
    if (pulseAnimId) cancelAnimationFrame(pulseAnimId);
    pulseAnimId = null;
    edgeLayer.querySelectorAll(".edge-pulse").forEach((n) => n.remove());
  }

  // ── Selection state machine
  let selectedAssetId = null;
  function select(assetId) {
    if (selectedAssetId === assetId) {
      // Toggle off
      for (const [, v] of cardIndex) v.group.classList.remove("is-selected");
      for (const [, v] of edgeIndex) v.group.classList.remove("is-highlighted");
      stopPulse();
      selectedAssetId = null;
      onSelect(null);
      return;
    }
    selectedAssetId = assetId;
    for (const [id, v] of cardIndex) v.group.classList.toggle("is-selected", id === assetId);
    // Highlight edges touching this asset
    let highlightedEdgeId = null;
    for (const [id, v] of edgeIndex) {
      const [s, t] = id.split("|");
      const touches = s === assetId || t === assetId;
      v.group.classList.toggle("is-highlighted", touches);
      if (touches && !highlightedEdgeId) highlightedEdgeId = id;
    }
    if (highlightedEdgeId) startPulse(highlightedEdgeId);
    onSelect(cardIndex.get(assetId)?.asset || null);
  }

  // Click empty stage to deselect
  svg.addEventListener("click", () => {
    if (selectedAssetId) select(selectedAssetId);
  });

  // ── Blast-radius overlay ─────────────────────────────────────────────
  let blastOverlay = null;

  function clearBlastRadius() {
    if (blastOverlay) {
      blastOverlay.remove();
      blastOverlay = null;
    }
    svg.classList.remove("blast-active");
  }

  function showBlastRadius(result, originAssetId) {
    clearBlastRadius();
    const origin = assetPos.get(originAssetId);
    if (!origin) return;
    svg.classList.add("blast-active");
    const cx = origin.x + origin.w / 2;
    const cy = origin.y + origin.h / 2;

    const overlay = el("g", { class: "blast-overlay" });
    blastOverlay = overlay;

    // Compute distances from origin to each impacted asset (graph-coord)
    const impacted = (result.impacted_assets || []).map((a) => {
      const p = assetPos.get(a.asset_id);
      if (!p) return null;
      const ax = p.x + p.w / 2;
      const ay = p.y + p.h / 2;
      return { id: a.asset_id, dist: Math.hypot(ax - cx, ay - cy), pos: p, asset: a };
    }).filter(Boolean);

    // Three concentric rings — inner (33% percentile), mid (66%), outer (100%).
    // Padding of +24 so the ring sits just outside the farthest card.
    if (impacted.length > 0) {
      const ds = impacted.map((x) => x.dist).sort((a, b) => a - b);
      const pick = (p) => ds[Math.min(ds.length - 1, Math.floor(ds.length * p))] || 80;
      const r3 = Math.max(pick(1.0) + 60, 140);
      const r2 = Math.max(pick(0.66) + 40, 100);
      const r1 = Math.max(pick(0.33) + 24, 60);
      // Outer ring (faintest, widest)
      overlay.appendChild(ringEl(cx, cy, r3, "blast-ring blast-ring-outer"));
      overlay.appendChild(ringEl(cx, cy, r2, "blast-ring blast-ring-mid"));
      overlay.appendChild(ringEl(cx, cy, r1, "blast-ring blast-ring-inner"));
    } else {
      // Isolated asset — just a single ring around the origin
      overlay.appendChild(ringEl(cx, cy, 80, "blast-ring blast-ring-inner"));
    }

    // Origin crosshair: target reticle on the compromised asset
    overlay.appendChild(el("circle", {
      cx, cy, r: 18,
      class: "blast-origin-ring",
    }));
    overlay.appendChild(el("line", {
      x1: cx - 26, y1: cy, x2: cx + 26, y2: cy,
      class: "blast-crosshair",
    }));
    overlay.appendChild(el("line", {
      x1: cx, y1: cy - 26, x2: cx, y2: cy + 26,
      class: "blast-crosshair",
    }));

    // Highlight every reachable asset
    for (const im of impacted) {
      overlay.appendChild(el("rect", {
        x: im.pos.x - 4, y: im.pos.y - 4,
        width: im.pos.w + 8, height: im.pos.h + 8,
        rx: 9, ry: 9,
        class: "blast-asset-hit",
      }));
    }

    // Highlight attack-path edges in red, on top of the regular edges
    const drawn = new Set();
    for (const path of (result.attack_paths || [])) {
      const hops = path.path || path.hops || [];
      for (let i = 0; i < hops.length - 1; i++) {
        const aid = hops[i].asset_id || hops[i];
        const bid = hops[i + 1].asset_id || hops[i + 1];
        const k = `${aid}|${bid}`;
        if (drawn.has(k)) continue;
        drawn.add(k);
        const a = assetPos.get(aid);
        const b = assetPos.get(bid);
        if (!a || !b) continue;
        overlay.appendChild(el("path", {
          d: orthogonalPath(a, b),
          class: "blast-path-edge",
        }));
      }
    }

    // Severity / score badge floating above the origin
    const sev = String(result.severity_label || "low").toLowerCase();
    const reach = impacted.length;
    const risk = Math.round(result.risk_score || 0);
    const badge = el("g", { class: "blast-badge" });
    const badgeW = 200, badgeH = 40;
    badge.appendChild(el("rect", {
      x: cx - badgeW / 2, y: cy - 96,
      width: badgeW, height: badgeH,
      rx: 6, ry: 6,
      class: `blast-badge-rect blast-badge-${sev}`,
    }));
    const t1 = el("text", {
      x: cx, y: cy - 80,
      "text-anchor": "middle",
      class: "blast-badge-sev",
    });
    t1.textContent = `BLAST RADIUS · ${sev.toUpperCase()}`;
    const t2 = el("text", {
      x: cx, y: cy - 65,
      "text-anchor": "middle",
      class: "blast-badge-meta",
    });
    t2.textContent = `${reach} reachable · risk ${risk}/100`;
    badge.appendChild(t1);
    badge.appendChild(t2);
    overlay.appendChild(badge);

    // Append last so it draws on top of cards + edges
    svg.appendChild(overlay);
  }

  function ringEl(cx, cy, r, cls) {
    return el("circle", { cx, cy, r, class: cls });
  }

  return {
    select,
    reset: () => { selectedAssetId && select(selectedAssetId); },
    selectedId: () => selectedAssetId,
    showBlastRadius,
    clearBlastRadius,
  };
}

// ─── helpers ─────────────────────────────────────────────────────────────

function el(tag, attrs = {}) {
  const node = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v !== undefined && v !== null) node.setAttribute(k, String(v));
  }
  return node;
}

function arrowMarker(id, color) {
  const m = el("marker", {
    id, viewBox: "0 0 10 10", refX: "9", refY: "5",
    markerWidth: "5", markerHeight: "5",
    orient: "auto-start-reverse",
  });
  const p = el("path", {
    d: "M 0 0 L 10 5 L 0 10 z",
    fill: color,
  });
  m.appendChild(p);
  return m;
}

function parseLevel(level) {
  const m = String(level || "").match(/L?(\d+(?:\.\d+)?)/i);
  return m ? parseFloat(m[1]) : null;
}

function severityCounts(findings) {
  return findings.reduce((acc, f) => {
    acc[f.severity] = (acc[f.severity] || 0) + 1;
    return acc;
  }, {});
}

// Orthogonal path with rounded corners.
// Routes from right edge of source to left edge of target via mid-x and mid-y.
function orthogonalPath(a, b) {
  const startX = a.x + a.w / 2;
  const startY = a.y + a.h / 2;
  const endX = b.x + b.w / 2;
  const endY = b.y + b.h / 2;
  // Determine the side to exit from based on relative position
  const dy = endY - startY;
  const dx = endX - startX;

  // Use vertical-then-horizontal routing for cross-band edges (Purdue layout)
  // Use horizontal-then-vertical for same-row edges
  const verticalFirst = Math.abs(dy) >= a.h * 0.6;
  const r = 10;

  if (verticalFirst) {
    // exit from top or bottom
    const exitY = dy > 0 ? a.y + a.h : a.y;
    const enterY = dy > 0 ? b.y : b.y + b.h;
    const midY = (exitY + enterY) / 2;
    const sx = startX, ex = endX;
    if (Math.abs(ex - sx) < 4) {
      return `M ${sx} ${exitY} L ${ex} ${enterY}`;
    }
    return `M ${sx} ${exitY}
            L ${sx} ${midY - Math.sign(dy) * r}
            Q ${sx} ${midY} ${sx + Math.sign(ex - sx) * r} ${midY}
            L ${ex - Math.sign(ex - sx) * r} ${midY}
            Q ${ex} ${midY} ${ex} ${midY + Math.sign(dy) * r}
            L ${ex} ${enterY}`;
  } else {
    const exitX = dx > 0 ? a.x + a.w : a.x;
    const enterX = dx > 0 ? b.x : b.x + b.w;
    const midX = (exitX + enterX) / 2;
    const sy = startY, ey = endY;
    if (Math.abs(ey - sy) < 4) {
      return `M ${exitX} ${sy} L ${enterX} ${ey}`;
    }
    return `M ${exitX} ${sy}
            L ${midX - Math.sign(dx) * r} ${sy}
            Q ${midX} ${sy} ${midX} ${sy + Math.sign(ey - sy) * r}
            L ${midX} ${ey - Math.sign(ey - sy) * r}
            Q ${midX} ${ey} ${midX + Math.sign(dx) * r} ${ey}
            L ${enterX} ${ey}`;
  }
}

function midPointOnPath(a, b) {
  return {
    x: (a.x + a.w / 2 + b.x + b.w / 2) / 2,
    y: (a.y + a.h / 2 + b.y + b.h / 2) / 2,
  };
}

function truncate(s, n) {
  if (!s) return "";
  return s.length <= n ? s : s.slice(0, n - 1) + "…";
}

// Approximate "truncate to pixel width" — uses a per-char advance estimate
// for the ~12px JetBrains Mono / system stack used for zone labels. Good
// enough to prevent cross-zone overflow without measuring text in the DOM.
function truncateToFit(s, pxWidth, fontPx = 12) {
  if (!s) return "";
  const approxCharW = fontPx * 0.62;
  const maxChars = Math.max(4, Math.floor(pxWidth / approxCharW));
  return s.length <= maxChars ? s : s.slice(0, Math.max(1, maxChars - 1)) + "…";
}
