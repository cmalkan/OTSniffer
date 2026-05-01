// attack-paths-overlay.js
//
// Animated red attack-path overlay that layers on top of the blast-radius
// reachability view. Consumes attack_paths[] from the new
// /api/assets/:assetId/attack-paths endpoint (schema in
// scripts/otsniff/attack-paths.mjs) and renders one or more multi-hop paths
// with per-hop protocol + leverage + MITRE TTP + exploit-gating tooltips.
//
// Distinct from the blast-radius reachability overlay (.blast-overlay):
//   - .blast-overlay  draws concentric rings + simple red edges = REACHABILITY
//   - .ap-overlay     draws animated kill-chain paths with per-hop semantics
//                     = WHAT THE ATTACKER ACTUALLY DOES
//
// Spec: docs/blast-radius-attack-paths.md
// Persona / hard rules: .claude/agents/blast-radius-pentester.md

const SVG_NS = 'http://www.w3.org/2000/svg';
const PATH_GAP_MS = 300;        // gap between paths in a multi-path render
const HOP_GAP_MS = 80;          // gap between consecutive hops within a path
const DEFAULT_HOP_SPEED_MS = 600;

// Speed proportional to inverse exploit-gating severity. A
// confirmed-remote-unauth hop tears through; a requires-physical hop crawls.
// Mirrors defaultAnimation() in scripts/otsniff/attack-paths.mjs.
const SPEED_BY_GATING = {
  'confirmed-remote-unauth': 480,
  'confirmed-remote-auth':   560,
  'requires-default-creds':  600,
  'requires-credentials':    640,
  'requires-adjacent':       700,
  'requires-specific-firmware': 720,
  'requires-physical':       880,
  'theoretical-only':       1000,
};

const OPACITY_BY_GATING = {
  'confirmed-remote-unauth': 1.0,
  'confirmed-remote-auth':   0.95,
  'requires-default-creds':  0.9,
  'requires-credentials':    0.85,
  'requires-adjacent':       0.75,
  'requires-specific-firmware': 0.7,
  'requires-physical':       0.55,
  'theoretical-only':        0.45,
};

// Public factory. `controller` is what renderSchematic() returns.
// Required controller methods: getSvg, getAssetBox, getAssetCenter, routeBetween.
export function createAttackPathsOverlay(controller, options = {}) {
  if (!controller || typeof controller.getSvg !== 'function') {
    throw new Error('attack-paths-overlay: controller missing required spatial accessors');
  }
  const tooltipParent = options.tooltipContainer || document.body;
  const ariaSummaryParent = options.ariaSummaryContainer || document.body;

  let overlayGroup = null;
  let tooltipEl = null;
  let activeTooltipKey = null;
  let pendingTimeouts = [];
  let ariaSummaryEl = null;
  let activePaths = [];

  function reducedMotion() {
    return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  function clearPaths() {
    pendingTimeouts.forEach((t) => clearTimeout(t));
    pendingTimeouts = [];
    if (overlayGroup) {
      overlayGroup.remove();
      overlayGroup = null;
    }
    if (tooltipEl) {
      tooltipEl.remove();
      tooltipEl = null;
    }
    if (ariaSummaryEl) {
      ariaSummaryEl.remove();
      ariaSummaryEl = null;
    }
    activeTooltipKey = null;
    activePaths = [];
  }

  // Render the given attack_paths[] on top of the schematic SVG. `fromAssetId`
  // is an optional UI hint (set when this view is the result of a two-click
  // "from A → to B" flow on the blast-radius view). Sorting is done by
  // path_confidence desc upstream — we render in order received.
  function showPaths(paths, ctx = {}) {
    clearPaths();
    if (!Array.isArray(paths) || paths.length === 0) return { rendered: 0 };
    activePaths = paths.slice();

    const svg = controller.getSvg();
    if (!svg) return { rendered: 0 };

    const reduced = reducedMotion();

    overlayGroup = createSvgEl('g', {
      class: 'ap-overlay',
      'data-from-asset-id': ctx.fromAssetId || '',
    });
    svg.appendChild(overlayGroup);

    // Single shared tooltip element — repositioned on hover/focus.
    tooltipEl = document.createElement('div');
    tooltipEl.className = 'ap-hop-tooltip';
    tooltipEl.setAttribute('role', 'tooltip');
    tooltipEl.setAttribute('aria-hidden', 'true');
    tooltipParent.appendChild(tooltipEl);

    // sr-only narrative — a per-render parallel description for AT users
    // who can't perceive the animated SVG.
    ariaSummaryEl = document.createElement('div');
    ariaSummaryEl.className = 'sr-only';
    ariaSummaryEl.setAttribute('role', 'status');
    ariaSummaryEl.setAttribute('aria-live', 'polite');
    ariaSummaryEl.textContent = buildSrSummary(paths, ctx);
    ariaSummaryParent.appendChild(ariaSummaryEl);

    let pathStartTime = 0;
    paths.forEach((path, pi) => {
      const pathDuration = renderPath(overlayGroup, path, pi, pathStartTime, reduced);
      pathStartTime += pathDuration + PATH_GAP_MS;
    });

    return { rendered: paths.length };
  }

  function renderPath(parent, path, pathIndex, startTime, reduced) {
    const pathGroup = createSvgEl('g', {
      class: 'ap-overlay__path',
      'data-path-id': path.path_id,
      role: 'region',
      'aria-label': `Attack path ${pathIndex + 1}: ${path.kill_chain_phase}, confidence ${path.path_confidence}. ${path.rationale || ''}`,
    });
    parent.appendChild(pathGroup);

    let hopOffset = 0;
    let totalDuration = 0;

    (path.hops || []).forEach((hop, hi) => {
      const speed = SPEED_BY_GATING[hop.exploit_gating] ?? DEFAULT_HOP_SPEED_MS;
      const opacity = OPACITY_BY_GATING[hop.exploit_gating] ?? 0.85;
      const d = controller.routeBetween(hop.from_asset_id, hop.to_asset_id);
      if (!d) return; // skip hop if either asset isn't on the canvas

      // Halo / underlay first so the main stroke draws on top.
      const glow = createSvgEl('path', { class: 'ap-path-glow', d, opacity: opacity * 0.7 });
      pathGroup.appendChild(glow);

      const stroke = createSvgEl('path', {
        class: 'ap-path',
        d,
        opacity,
        tabindex: '0',
        role: 'button',
        'aria-label': srHopLabel(hop, hi, path),
        'data-path-id': path.path_id,
        'data-hop-index': String(hi),
      });
      pathGroup.appendChild(stroke);

      // Hop endpoint marker — circle at hop.to_asset_id's center.
      const toCenter = controller.getAssetCenter(hop.to_asset_id);
      let marker = null;
      if (toCenter) {
        marker = createSvgEl('circle', {
          class: 'ap-hop-marker',
          cx: toCenter.x,
          cy: toCenter.y,
          r: 6,
          tabindex: '0',
          role: 'button',
          'aria-label': srHopLabel(hop, hi, path),
          'data-path-id': path.path_id,
          'data-hop-index': String(hi),
        });
        pathGroup.appendChild(marker);
      }

      // Compute path length for stroke-dashoffset animation.
      let len = 0;
      try { len = stroke.getTotalLength(); } catch { /* path not in DOM yet — ok */ }

      const hopStart = startTime + hopOffset;

      if (reduced) {
        // No animation: render statically with full opacity & gating-derived alpha.
        stroke.setAttribute('stroke-dasharray', 'none');
        stroke.setAttribute('stroke-dashoffset', '0');
        glow.setAttribute('stroke-dasharray', 'none');
        glow.setAttribute('stroke-dashoffset', '0');
        if (marker) marker.setAttribute('opacity', String(opacity));
        // Hop labels rendered at the to-marker for plant-manager readability
        // when motion can't carry the message.
        appendStaticHopLabel(pathGroup, hop, hi, toCenter);
      } else {
        // Animate: dasharray = path length, offset → 0 over `speed`.
        if (len > 0) {
          stroke.style.strokeDasharray = String(len);
          stroke.style.strokeDashoffset = String(len);
          glow.style.strokeDasharray = String(len);
          glow.style.strokeDashoffset = String(len);
        }
        if (marker) marker.setAttribute('opacity', '0');

        // Custom transition duration per hop based on gating speed.
        stroke.style.transitionDuration = `${speed}ms`;
        glow.style.transitionDuration = `${speed}ms`;

        const startAnimT = setTimeout(() => {
          requestAnimationFrame(() => {
            stroke.style.strokeDashoffset = '0';
            glow.style.strokeDashoffset = '0';
          });
        }, hopStart);
        pendingTimeouts.push(startAnimT);

        const showMarkerT = setTimeout(() => {
          if (marker) {
            marker.style.transition = `opacity 240ms var(--ease-attack, cubic-bezier(0.23, 1, 0.32, 1))`;
            marker.setAttribute('opacity', String(opacity));
          }
        }, hopStart + speed * 0.6);
        pendingTimeouts.push(showMarkerT);
      }

      attachHopInteractions(stroke, hop, hi, path);
      if (marker) attachHopInteractions(marker, hop, hi, path);

      hopOffset += speed + HOP_GAP_MS;
      totalDuration = hopOffset;
    });

    return totalDuration;
  }

  function attachHopInteractions(node, hop, hopIndex, path) {
    const key = `${path.path_id}|${hopIndex}`;
    node.addEventListener('mouseenter', () => showTooltip(node, hop, hopIndex, path, key));
    node.addEventListener('mouseleave', (ev) => {
      if (ev.relatedTarget && tooltipEl && tooltipEl.contains(ev.relatedTarget)) return;
      hideTooltip(key);
    });
    node.addEventListener('focus', () => showTooltip(node, hop, hopIndex, path, key));
    node.addEventListener('blur', () => hideTooltip(key));
  }

  function showTooltip(node, hop, hopIndex, path, key) {
    if (!tooltipEl) return;
    activeTooltipKey = key;
    tooltipEl.innerHTML = renderTooltipHTML(hop, hopIndex, path);
    tooltipEl.setAttribute('aria-hidden', 'false');
    positionTooltip(node);
    tooltipEl.dataset.visible = '1';
  }

  function hideTooltip(key) {
    if (!tooltipEl) return;
    if (activeTooltipKey && activeTooltipKey !== key) return; // another hop took over
    tooltipEl.dataset.visible = '0';
    tooltipEl.setAttribute('aria-hidden', 'true');
    activeTooltipKey = null;
  }

  function positionTooltip(node) {
    const rect = node.getBoundingClientRect();
    if (!rect) return;
    // Place tooltip 12px below the node, horizontally centered, clamped to viewport.
    const tipRect = tooltipEl.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    let left = rect.left + rect.width / 2 - tipRect.width / 2;
    let top = rect.bottom + 12;
    left = Math.max(8, Math.min(left, vw - tipRect.width - 8));
    if (top + tipRect.height > vh - 8) {
      top = rect.top - tipRect.height - 12;
    }
    tooltipEl.style.left = `${Math.round(left + window.scrollX)}px`;
    tooltipEl.style.top = `${Math.round(top + window.scrollY)}px`;
  }

  function focusPath(pathId) {
    if (!overlayGroup) return false;
    const node = overlayGroup.querySelector(`[data-path-id="${cssEscape(pathId)}"][data-hop-index="0"]`);
    if (node) {
      try { node.focus(); } catch {}
      return true;
    }
    return false;
  }

  return {
    showPaths,
    clearPaths,
    focusPath,
    getActive: () => activePaths.slice(),
    isShowing: () => activePaths.length > 0,
  };
}

// ─── helpers ──────────────────────────────────────────────────────────────

function createSvgEl(tag, attrs = {}) {
  const node = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v !== undefined && v !== null) node.setAttribute(k, String(v));
  }
  return node;
}

function appendStaticHopLabel(parent, hop, hopIndex, center) {
  if (!center) return;
  // Reduced-motion mode shows MORE label content, not less, since the
  // animation can't carry meaning. Protocol + gating + first MITRE TTP
  // gives a hover-free defensible read of the kill chain.
  const ttp = (hop.mitre_attack_for_ics || [])[0] || '';
  const text = `${hopIndex + 1}. ${hop.protocol} · ${hop.exploit_gating}${ttp ? ' · ' + ttp : ''}`;
  const padX = 6, padY = 3, fontSize = 10;
  const charW = fontSize * 0.6;
  const w = Math.max(36, text.length * charW + padX * 2);
  const h = fontSize + padY * 2;
  const bx = center.x + 8;
  const by = center.y - h - 8;
  parent.appendChild(createSvgEl('rect', {
    class: 'ap-hop-label-bg',
    x: bx, y: by, width: w, height: h, rx: 3, ry: 3,
  }));
  const t = createSvgEl('text', {
    class: 'ap-hop-label-text',
    x: bx + padX,
    y: by + h - padY - 1,
  });
  t.textContent = text;
  parent.appendChild(t);
}

function renderTooltipHTML(hop, hopIndex, path) {
  const ttps = (hop.mitre_attack_for_ics || []).join(', ');
  const safe = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])
  );
  return `
    <div class="ap-hop-tooltip__row">
      <span class="ap-hop-tooltip__label">Hop</span>
      <span class="ap-hop-tooltip__value">${hopIndex + 1} of ${path.hops.length}</span>
    </div>
    <div class="ap-hop-tooltip__row">
      <span class="ap-hop-tooltip__label">Protocol</span>
      <span class="ap-hop-tooltip__value">${safe(hop.protocol)}</span>
    </div>
    <div class="ap-hop-tooltip__row">
      <span class="ap-hop-tooltip__label">Leverage</span>
      <span class="ap-hop-tooltip__value">${safe(hop.leverage)}</span>
    </div>
    <div class="ap-hop-tooltip__row">
      <span class="ap-hop-tooltip__label">MITRE</span>
      <span class="ap-hop-tooltip__value">${safe(ttps)}</span>
    </div>
    <div class="ap-hop-tooltip__row ap-hop-tooltip__row--gating">
      <span class="ap-hop-tooltip__label">Gating</span>
      <span class="ap-hop-tooltip__value ap-hop-tooltip__value--${safe(hop.exploit_gating)}">${safe(hop.exploit_gating)}</span>
    </div>
  `;
}

function srHopLabel(hop, hopIndex, path) {
  const ttps = (hop.mitre_attack_for_ics || []).join(' and ');
  const dec = path._decoration;
  const fromName = dec?.hop_asset_names?.[hopIndex]?.from_name || hop.from_asset_id;
  const toName = dec?.hop_asset_names?.[hopIndex]?.to_name || hop.to_asset_id;
  return `Hop ${hopIndex + 1}: from ${fromName} to ${toName}, protocol ${hop.protocol}, leverage ${hop.leverage}, MITRE techniques ${ttps}, exploit gating ${hop.exploit_gating}.`;
}

function buildSrSummary(paths, ctx) {
  const head = ctx.fromAssetId
    ? `Showing ${paths.length} attack ${paths.length === 1 ? 'path' : 'paths'} from a compromised origin to the selected asset.`
    : `Showing ${paths.length} attack ${paths.length === 1 ? 'path' : 'paths'} reaching the selected asset.`;
  const lines = paths.map((p, i) => {
    const dec = p._decoration || {};
    const compromisedName = dec.compromised_asset_name || p.compromised_asset_id;
    const targetName = dec.target_asset_name || p.target_asset_id;
    return `Path ${i + 1}: ${p.kill_chain_phase}, confidence ${p.path_confidence}, ${p.hops?.length || 0} hops from ${compromisedName} to ${targetName}. ${p.rationale || ''}`;
  });
  return [head, ...lines].join(' ');
}

function cssEscape(s) {
  if (window.CSS && window.CSS.escape) return window.CSS.escape(s);
  return String(s).replace(/"/g, '\\"');
}
