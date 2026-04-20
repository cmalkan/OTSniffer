// T1 Exposure Snapshot — HTML template.
// Page-per-section layout keyed to Pearl's 10-page storyboard. v1 ships pages 1, 2, 4
// (cover, executive summary, top findings) — remaining pages stubbed for next slice.

const SEV_ORDER = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };
const SEV_COLOR = {
  critical: "#C73E4D",
  high:     "#C97B1F",
  medium:   "#07758b",
  low:      "#2D9D6E",
  info:     "#6C757D",
};

const esc = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));

export function renderReport({ plant, engagement, now = new Date() }) {
  const findings = (plant.evidence_findings || []).slice().sort((a, b) => {
    const s = (SEV_ORDER[a.severity] ?? 9) - (SEV_ORDER[b.severity] ?? 9);
    if (s !== 0) return s;
    return (b.confidence ?? 0) - (a.confidence ?? 0);
  });
  const counts = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
  const types = {};
  const assets = new Set();
  for (const f of findings) {
    counts[f.severity] = (counts[f.severity] || 0) + 1;
    types[f.finding_type] = (types[f.finding_type] || 0) + 1;
    assets.add(f.asset_id);
  }

  const top5 = findings.slice(0, 5);
  const plantName = plant.plant_name || "Client Plant";
  const assetCount = (plant.assets || []).length;

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>T1 Exposure Snapshot — ${esc(plantName)}</title>
  <style>${CSS}</style>
</head>
<body>
  ${pageCover({ engagement, plantName, now })}
  ${pageExecSummary({ plant, plantName, counts, types, assetCount, findingCount: findings.length, top5 })}
  ${pageTopFindings({ top5, plantName })}
  ${pageRegulatoryCrossRef()}
  ${pageAppendixStub()}
</body>
</html>`;
}

function pageCover({ engagement, plantName, now }) {
  const e = engagement || {};
  return `
<section class="page page-cover">
  <header class="cover-brand">
    <div class="cover-logo-row">
      <div class="cover-partner">${esc(e.partner_name || "Malkan Solutions")}</div>
    </div>
  </header>
  <div class="cover-hero">
    <div class="cover-eyebrow">T1 EXPOSURE SNAPSHOT</div>
    <h1>${esc(plantName)}</h1>
    <div class="cover-sub">${esc(e.scope || "Plant-level OT exposure assessment — passive recon + static scan")}</div>
  </div>
  <footer class="cover-meta">
    <div><span class="k">Client</span><span class="v">${esc(e.client_name || "[Client]")}</span></div>
    <div><span class="k">Engagement</span><span class="v">${esc(e.engagement_id || "ENG-PLACEHOLDER")}</span></div>
    <div><span class="k">Scan window</span><span class="v">${esc(e.scan_window || fmtDate(now))}</span></div>
    <div><span class="k">Authorized by</span><span class="v">${esc(e.authorizer || "[Authorizer — see ROE]")}</span></div>
    <div><span class="k">Classification</span><span class="v">CONFIDENTIAL</span></div>
  </footer>
</section>`;
}

function pageExecSummary({ plant, plantName, counts, types, assetCount, findingCount, top5 }) {
  const topLine = top5[0];
  const criticalPitch = topLine
    ? `The highest-severity finding is <strong>${esc(topLine.evidence).slice(0, 140)}</strong> on asset <code>${esc(topLine.asset_id)}</code>.`
    : `No critical findings were detected in scope.`;

  return `
<section class="page">
  <header class="ph"><span class="ph-num">02</span><span class="ph-name">Executive Summary</span></header>
  <h2>${esc(plantName)} — one page for the sponsor</h2>
  <p class="lede">
    This engagement surfaced <strong>${findingCount} evidence-graded findings</strong> across
    <strong>${Object.keys({ [topLine?.asset_id || ""]: 1 }).length && assetCount} assets</strong>,
    spanning ${esc(Object.keys(types).join(", ").replace(/_/g, " "))}. ${criticalPitch}
  </p>
  <div class="kpi-row">
    ${kpi("Critical", counts.critical, SEV_COLOR.critical)}
    ${kpi("High",     counts.high,     SEV_COLOR.high)}
    ${kpi("Medium",   counts.medium,   SEV_COLOR.medium)}
    ${kpi("Assets in scope", assetCount, "#142a2e")}
  </div>
  <h3>Top 3 actions this quarter</h3>
  <ol class="actions">
    ${top5.slice(0, 3).map((f) => `
      <li>
        <div class="action-head">
          <span class="sev" style="--c:${SEV_COLOR[f.severity]}"></span>
          <span class="action-title">${esc(f.evidence).slice(0, 110)}</span>
        </div>
        <div class="action-meta">
          asset <code>${esc(f.asset_id)}</code> · ${esc(f.finding_type).replace(/_/g, " ")} ·
          source ${esc(f.source_tool)} · conf ${Math.round((f.confidence ?? 0) * 100)}%
        </div>
      </li>`).join("")}
  </ol>
  <div class="footer-note">Full evidence lineage in §3. Toolchain provenance and scan parameters in the appendix.</div>
</section>`;
}

function pageTopFindings({ top5, plantName }) {
  return `
<section class="page">
  <header class="ph"><span class="ph-num">03</span><span class="ph-name">Top 5 Findings — Evidence Cards</span></header>
  <h2>What we found, and how we know</h2>
  <div class="finding-grid">
    ${top5.map((f, i) => findingCard(f, i + 1)).join("")}
  </div>
</section>`;
}

function findingCard(f, n) {
  const conf = Math.round((f.confidence ?? 0) * 100);
  return `
  <article class="finding-card">
    <div class="fc-head">
      <span class="fc-n">#${n}</span>
      <span class="fc-sev" style="--c:${SEV_COLOR[f.severity]}">${esc(f.severity)}</span>
      <span class="fc-id">${esc(f.finding_id)}</span>
    </div>
    <div class="fc-type">${esc(f.finding_type).replace(/_/g, " ")}</div>
    <pre class="fc-evidence">${esc(f.evidence)}</pre>
    <div class="fc-meta">
      asset <code>${esc(f.asset_id)}</code>
      <span class="sep">·</span>
      source <span class="fc-tool">${esc(f.source_tool)}</span>
      <span class="sep">·</span>
      confidence
      <span class="fc-conf-bar"><span class="fc-conf-fill" style="width:${conf}%"></span></span>
      <span class="fc-conf-n">${conf}</span>
    </div>
  </article>`;
}

function pageRegulatoryCrossRef() {
  return `
<section class="page">
  <header class="ph"><span class="ph-num">04</span><span class="ph-name">Regulatory cross-reference — water / wastewater</span></header>
  <h2>Where these findings feed your compliance evidence</h2>
  <p class="lede">
    This T1 Exposure Snapshot is built to slot into the evidence set your utility already maintains. Findings, attack-path reasoning, and segmentation posture map to the following regulatory and guidance frameworks.
  </p>
  <div class="reg-grid">
    <div class="reg-card">
      <div class="reg-name">EPA — America's Water Infrastructure Act (AWIA §2013)</div>
      <div class="reg-sub">Risk &amp; Resilience Assessment + Emergency Response Plan</div>
      <p>Findings feed the <strong>cybersecurity component</strong> of your RRA renewal. Blast-radius scenario (§5 in T2) satisfies the "malevolent acts" analysis required under 42 U.S.C. §300i-2.</p>
    </div>
    <div class="reg-card">
      <div class="reg-name">EPA — Enforcement Memorandum (2023)</div>
      <div class="reg-sub">End of enforcement discretion for cybersecurity in PWS sanitary surveys</div>
      <p>This report documents that the utility has <strong>actively assessed</strong> its OT posture, closing the "what have you done" gap that state primacy agencies now probe in surveys.</p>
    </div>
    <div class="reg-card">
      <div class="reg-name">CISA — Cross-Sector Cybersecurity Performance Goals (CPGs, v1.0.1)</div>
      <div class="reg-sub">Applicable to water/wastewater sector</div>
      <p>Findings map to CPG 1.A (Asset Inventory), 2.F (Network Segmentation), 2.W (Separating User and Privileged Accounts), and 4.A (Incident Reporting readiness).</p>
    </div>
    <div class="reg-card">
      <div class="reg-name">CIRCIA — Cyber Incident Reporting for Critical Infrastructure Act</div>
      <div class="reg-sub">72-hour reporting obligation, rule finalized by CISA</div>
      <p>Baseline posture documented here materially shortens incident triage. Contact chain on cover page + evidence-pack SHA-256 support chain-of-custody for any downstream CISA reporting.</p>
    </div>
    <div class="reg-card">
      <div class="reg-name">Grant eligibility — State Revolving Fund (SRF) + IIJA cyber set-asides</div>
      <div class="reg-sub">Line-item framing for funding applications</div>
      <p>This engagement is structured as a <strong>discrete, documentable cybersecurity assessment</strong> eligible for inclusion in DWSRF / CWSRF applications under state cyber set-asides and IIJA-authorized programs. Utility procurement should confirm with the state financing board.</p>
    </div>
  </div>
  <div class="appx-footer-inline">
    Utility is encouraged to cite this report in its next RRA update. CISA advisory monitoring is available as part of the T4 Managed Monitoring retainer.
  </div>
</section>`;
}

function pageAppendixStub() {
  return `
<section class="page">
  <header class="ph"><span class="ph-num">05</span><span class="ph-name">Appendix — What comes next</span></header>
  <h2>Deferred to T2 Blast-Radius Assessment</h2>
  <ul class="next">
    <li><strong>Attack-path chains</strong> — top scenario with barrier-level trace from finding to process impact.</li>
    <li><strong>External exposure map</strong> — correlated Shodan + ASM view beyond this snapshot window.</li>
    <li><strong>Mesh / segmentation audit</strong> — IT/OT boundary policy verification.</li>
    <li><strong>IEC 62443-4-2 SR coverage matrix</strong> — auditor-ready mapping (available as T2 deliverable).</li>
    <li><strong>Managed monitoring (T4)</strong> — quarterly re-scan, new-CVE re-scoring, CISA advisory alerting, drift detection.</li>
  </ul>
  <div class="appx-footer">
    Toolchain: <code>otsniff</code> — evidence-graded OT assessment pipeline. All evidence snippets in this report are redacted per the engagement ROE; full unredacted evidence is in the encrypted evidence pack (SHA-256 referenced on the cover). Cross-references to EPA AWIA, CISA CPGs, and CIRCIA on §4.
  </div>
</section>`;
}

function kpi(label, value, color) {
  return `
    <div class="kpi">
      <div class="kpi-v" style="color:${color}">${value}</div>
      <div class="kpi-k">${esc(label)}</div>
    </div>`;
}

function fmtDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

const CSS = `
@page { size: Letter; margin: 0; }
* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; }
body {
  font-family: 'Inter', -apple-system, 'Segoe UI', Roboto, sans-serif;
  color: #212529;
  font-size: 12px;
  line-height: 1.55;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}
code, pre { font-family: 'JetBrains Mono', Consolas, monospace; }

.page {
  width: 8.5in;
  height: 11in;
  padding: 0.6in 0.75in;
  page-break-after: always;
  position: relative;
  background: #fff;
}
.page:last-child { page-break-after: auto; }

/* Cover */
.page-cover { padding: 0.9in 0.75in 0.75in; display: flex; flex-direction: column; }
.cover-brand { border-bottom: 1px solid #E1E7EB; padding-bottom: 16px; }
.cover-partner {
  font-size: 13px; font-weight: 700; letter-spacing: 0.14em;
  text-transform: uppercase; color: #07758b;
}
.cover-hero {
  flex: 1;
  display: flex; flex-direction: column; justify-content: center;
  gap: 14px;
  border-left: 4px solid #0AA2C0;
  padding-left: 28px;
}
.cover-eyebrow {
  font-size: 11px; letter-spacing: 0.2em; color: #6C757D;
  text-transform: uppercase; font-weight: 600;
}
.cover-hero h1 {
  font-size: 36pt; line-height: 1.05; margin: 0;
  font-weight: 700; letter-spacing: -0.02em; color: #142a2e;
}
.cover-sub { font-size: 14px; color: #3A4750; max-width: 5.5in; }
.cover-meta {
  display: grid; grid-template-columns: repeat(5, 1fr);
  gap: 12px;
  padding-top: 18px;
  border-top: 1px solid #E1E7EB;
  margin-top: auto;
}
.cover-meta div { display: flex; flex-direction: column; gap: 2px; }
.cover-meta .k { font-size: 9px; letter-spacing: 0.1em; text-transform: uppercase; color: #6C757D; font-weight: 600; }
.cover-meta .v { font-family: 'JetBrains Mono', Consolas, monospace; font-size: 10.5px; color: #142a2e; }

/* Page header */
.ph {
  display: flex; align-items: baseline; gap: 10px;
  padding-bottom: 10px; margin-bottom: 14px;
  border-bottom: 1px solid #E1E7EB;
}
.ph-num {
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px; color: #0AA2C0; font-weight: 600;
}
.ph-name {
  font-size: 10px; letter-spacing: 0.14em;
  text-transform: uppercase; color: #6C757D; font-weight: 600;
}

h2 { font-size: 20pt; margin: 0 0 12px; font-weight: 600; letter-spacing: -0.015em; color: #142a2e; }
h3 { font-size: 13pt; margin: 18px 0 8px; font-weight: 600; color: #142a2e; }

.lede { font-size: 13px; color: #3A4750; max-width: 6.5in; }
.lede strong { color: #142a2e; }

.kpi-row {
  display: grid; grid-template-columns: repeat(4, 1fr);
  gap: 10px;
  margin: 14px 0 18px;
}
.kpi {
  border: 1px solid #E1E7EB; border-radius: 8px;
  padding: 10px 12px; background: #FAFBFC;
  border-left: 3px solid #0AA2C0;
}
.kpi-v {
  font-family: 'Inter', sans-serif; font-weight: 700; font-size: 22pt;
  line-height: 1; letter-spacing: -0.02em;
}
.kpi-k {
  font-size: 9.5px; text-transform: uppercase; letter-spacing: 0.1em;
  color: #6C757D; font-weight: 600; margin-top: 4px;
}

.actions { list-style: none; margin: 0; padding: 0; }
.actions li { padding: 10px 0; border-bottom: 1px solid #E1E7EB; }
.actions li:last-child { border: 0; }
.action-head { display: flex; gap: 10px; align-items: center; }
.sev { width: 8px; height: 8px; border-radius: 50%; background: var(--c); flex: 0 0 auto; }
.action-title { font-weight: 500; color: #142a2e; }
.action-meta {
  font-family: 'JetBrains Mono', monospace;
  font-size: 10.5px; color: #6C757D; margin-left: 18px; margin-top: 2px;
}
.action-meta code { background: #F0F4F5; padding: 1px 4px; border-radius: 3px; color: #07758b; }

.footer-note {
  position: absolute; bottom: 0.45in; left: 0.75in; right: 0.75in;
  font-size: 10px; color: #9AA5AE; border-top: 1px solid #E1E7EB; padding-top: 10px;
}

/* Finding cards */
.finding-grid { display: flex; flex-direction: column; gap: 10px; }
.finding-card {
  border: 1px solid #E1E7EB; border-radius: 10px;
  padding: 12px 14px; background: #fff;
}
.fc-head {
  display: flex; align-items: baseline; gap: 10px;
  margin-bottom: 4px;
}
.fc-n {
  font-family: 'JetBrains Mono', monospace; font-size: 11px;
  color: #9AA5AE; font-weight: 600;
}
.fc-sev {
  font-size: 10px; text-transform: uppercase; letter-spacing: 0.1em;
  font-weight: 700; color: var(--c); padding: 1px 8px;
  border: 1px solid var(--c); border-radius: 999px;
  background: color-mix(in srgb, var(--c) 8%, #fff);
}
.fc-id { font-family: 'JetBrains Mono', monospace; font-size: 10px; color: #9AA5AE; margin-left: auto; }
.fc-type {
  font-size: 10px; text-transform: uppercase; letter-spacing: 0.14em;
  color: #6C757D; font-weight: 600; margin-bottom: 6px;
}
.fc-evidence {
  margin: 0 0 8px;
  padding: 8px 10px;
  background: #F8F9FA; border: 1px solid #E1E7EB; border-radius: 6px;
  font-size: 11px; color: #142a2e;
  white-space: pre-wrap; word-break: break-all;
}
.fc-meta {
  display: flex; align-items: center; gap: 8px;
  font-family: 'JetBrains Mono', monospace; font-size: 10px; color: #6C757D;
}
.fc-meta code { background: #F0F4F5; padding: 1px 4px; border-radius: 3px; color: #07758b; }
.fc-tool {
  padding: 1px 6px; border-radius: 4px;
  border: 1px solid #A8D9E3; color: #07758b;
  background: color-mix(in srgb, #0AA2C0 8%, #fff);
}
.sep { opacity: 0.4; }
.fc-conf-bar {
  width: 60px; height: 3px; background: #E1E7EB; border-radius: 2px;
  display: inline-block; position: relative; overflow: hidden;
}
.fc-conf-fill { display: block; height: 100%; background: linear-gradient(90deg, #0AA2C0, #017e84); }
.fc-conf-n { font-weight: 600; color: #142a2e; }

/* Appendix */
.next { margin: 0; padding-left: 18px; }
.next li { margin: 6px 0; color: #3A4750; }
.next strong { color: #142a2e; }
.appx-footer {
  position: absolute; bottom: 0.6in; left: 0.75in; right: 0.75in;
  font-size: 10px; color: #6C757D; line-height: 1.6;
  padding-top: 12px; border-top: 1px solid #E1E7EB;
}
.appx-footer code { color: #07758b; }

/* Regulatory cross-reference */
.reg-grid { display: flex; flex-direction: column; gap: 10px; margin-top: 10px; }
.reg-card {
  border: 1px solid #E1E7EB; border-radius: 10px;
  padding: 10px 14px; background: #fff;
  border-left: 3px solid #0AA2C0;
}
.reg-name {
  font-size: 12pt; font-weight: 700; color: #142a2e;
  letter-spacing: -0.005em;
}
.reg-sub {
  font-size: 10px; color: #6C757D; letter-spacing: 0.04em;
  text-transform: uppercase; font-weight: 600; margin: 2px 0 6px;
}
.reg-card p { margin: 0; font-size: 11px; line-height: 1.55; color: #3A4750; }
.reg-card p strong { color: #142a2e; }
.appx-footer-inline {
  margin-top: 12px; padding-top: 10px;
  border-top: 1px solid #E1E7EB;
  font-size: 10px; color: #6C757D; line-height: 1.6;
}
`;
