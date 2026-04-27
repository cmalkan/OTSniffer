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

  // Geometry — sized for 14px asset name + 12px metadata at typical viewport.
  const ASSET_W = 220;
  const ASSET_H = 104;
  const ASSET_GAP_X = 28;
  const ZONE_PAD = 24;
  const ZONE_GAP = 40;
  const BAND_LABEL_W = 150;
  const BAND_PAD_TOP = 42;
  const BAND_PAD_BOTTOM = 28;
  const PADDING_X = BAND_LABEL_W + 36;
  const PADDING_TOP = 80;

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
      // We stack assets vertically inside a zone if the zone is "narrow" or
      // place them in 1 row. With small fixtures we use a single row of cards.
      const cols = Math.max(1, assets.length);
      const zoneWidth = cols * ASSET_W + (cols - 1) * ASSET_GAP_X + 2 * ZONE_PAD;

      const assetCoords = assets.map((a, i) => ({
        asset: a,
        x: cursorX + ZONE_PAD + i * (ASSET_W + ASSET_GAP_X),
        // Asset Y placed within band; computed after bandHeight is known
        i,
      }));

      zoneLayouts.push({
        zone: z,
        x: cursorX,
        width: zoneWidth,
        assets: assetCoords,
      });

      cursorX += zoneWidth + ZONE_GAP;
      maxAssetsInBand = Math.max(maxAssetsInBand, assets.length);
    }

    const bandHeight = ASSET_H + 2 * ZONE_PAD + BAND_PAD_TOP + BAND_PAD_BOTTOM;
    // Now finalize asset Y positions
    for (const zl of zoneLayouts) {
      for (const ac of zl.assets) {
        ac.y = cursorY + BAND_PAD_TOP + ZONE_PAD;
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
        height: ASSET_H + 2 * ZONE_PAD,
        rx: 14, ry: 14,
      });
      svg.appendChild(zoneRect);

      const zoneLabel = el("text", {
        class: "zone-label",
        x: zl.x + 18,
        y: bl.y + BAND_PAD_TOP - 14,
      });
      zoneLabel.textContent = `${zl.zone.zone_id.toUpperCase()} · ${zl.zone.name}`;
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

  const edgeIndex = new Map(); // edgeId -> { groupEl, pathEl }
  for (const c of graph.connectivity || []) {
    const a = assetPos.get(c.source_asset_id);
    const b = assetPos.get(c.target_asset_id);
    if (!a || !b) continue;
    const edgeId = `${c.source_asset_id}|${c.target_asset_id}`;
    const group = el("g", { class: "edge-group", "data-edge": edgeId });
    const trustClass = c.trust_level === "low" ? "is-untrusted" :
                       c.trust_level === "medium" ? "is-medium" : "";
    const d = orthogonalPath(a, b);
    const path = el("path", {
      class: `edge-line ${trustClass}`,
      d,
      "marker-end":
        c.trust_level === "low" ? "url(#arrow-warn)" :
        c.trust_level === "medium" ? "url(#arrow-bright)" :
        "url(#arrow-default)",
    });
    group.appendChild(path);

    // Edge label rendered at midpoint
    const mid = midPointOnPath(a, b);
    const label = el("text", {
      class: "edge-label",
      x: mid.x, y: mid.y - 4,
      "text-anchor": "middle",
    });
    label.textContent = PROTO_LABEL[c.protocol] || c.protocol;
    group.appendChild(label);

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

  return {
    select,
    reset: () => { selectedAssetId && select(selectedAssetId); },
    selectedId: () => selectedAssetId,
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
