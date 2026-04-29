// Onboarding — build a plant fixture from a customer BOM, with browser-side
// parsing of CSV / DOCX / PDF files. Customer data stays in the browser
// until the explicit Save click; the server only receives the structured
// JSON the operator confirmed.

import { setPlantKey } from '/js/api.js';
import { inferAssetTypeFromText, inferTopologyFromLines } from '/js/topology-extract.js';
import { tagAssetsFromPdfLines } from '/js/vendor-recognize.js';
import { inferAssetFunction } from '/js/asset-function.js';

const $ = (id) => document.getElementById(id);
const escape = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;" }[c]));

// State
const state = {
  bom:   [],   // array of asset objects
  zones: [],
  conn:  [],
  drawings: [], // { url, name, size, content_type }
};

const ASSET_FIELDS  = ['asset_id', 'name', 'asset_type', 'essential_function', 'vendor', 'model', 'firmware_version', 'ip_address', 'zone_id', 'criticality_score', 'process_tag'];
const ZONE_FIELDS   = ['zone_id', 'name', 'level', 'description'];
const CONN_FIELDS   = ['source_asset_id', 'target_asset_id', 'protocol', 'port', 'trust_level', 'allowed_direction'];
const ASSET_TYPES   = ['scada-server', 'historian', 'hmi', 'engineering-workstation', 'plc', 'safety-controller', 'rtu', 'firewall', 'switch'];
const TRUST_LEVELS  = ['high', 'medium', 'low'];
const DIRECTIONS    = ['bi', 'uni'];

// Auto-mapping aliases for column headers (case + punctuation insensitive).
// Maps any normalized header string to its canonical asset field.
const HEADER_ALIASES = {
  asset_id:          ['assetid', 'id', 'tag', 'tagname', 'asset', 'assetname', 'identifier', 'deviceid', 'node'],
  name:              ['name', 'description', 'desc', 'label', 'assetdescription', 'friendly', 'friendlyname', 'hostname', 'servername', 'switchname', 'firewallname', 'controllername', 'stationname'],
  asset_type:        ['type', 'assettype', 'category', 'class', 'kind', 'deviceclass'],
  vendor:            ['vendor', 'manufacturer', 'make', 'mfr', 'oem'],
  model:             ['model', 'modelnumber', 'modelno', 'partnumber', 'partno', 'product', 'productname', 'pn', 'switchmodel', 'firewallmodel', 'servermodel'],
  firmware_version:  ['firmware', 'firmwareversion', 'version', 'fw', 'rev', 'revision', 'fwversion'],
  ip_address:        ['ip', 'ipaddress', 'address', 'ipaddr'],
  zone_id:           ['zone', 'zoneid', 'subnet', 'network', 'vlan', 'segment'],
  criticality_score: ['criticality', 'crit', 'priority', 'importance', 'criticalityscore', 'risk'],
  process_tag:       ['process', 'processtag', 'function', 'role', 'service'],
};

// ── init ────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  bindIdentity();
  bindBOMUploader();
  bindBOMToolbar();
  bindZoneToolbar();
  bindConnToolbar();
  bindDrawingUploader();
  bindSave();
  // Seed one empty row in each table so the form looks alive
  addBOMRow(); renderBOM();
  addZoneRow(); renderZones();
  addConnRow(); renderConn();
});

// ── plant identity ──────────────────────────────────────────────────────

function bindIdentity() {
  const nameEl = $('plantName');
  const idEl = $('plantId');
  const keyEl = $('plantKey');
  nameEl.addEventListener('input', () => {
    const slug = slugify(nameEl.value);
    if (!idEl.dataset.touched) idEl.value = slug ? `plant-${slug.split('-')[0]}` : '';
    if (!keyEl.dataset.touched) keyEl.value = slug.split('-')[0] || '';
  });
  idEl.addEventListener('input', () => idEl.dataset.touched = '1');
  keyEl.addEventListener('input', () => keyEl.dataset.touched = '1');
}

function slugify(s) {
  return String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

// ── BOM table ───────────────────────────────────────────────────────────

function bindBOMToolbar() {
  $('bomAddRow').addEventListener('click', () => { addBOMRow(); renderBOM(); });
  $('bomClear').addEventListener('click',   () => { state.bom = []; renderBOM(); });
  $('bomLoadSample').addEventListener('click', () => {
    state.bom = sampleBOM();
    state.zones = sampleZones();
    state.conn = sampleConn();
    if (!$('plantName').value) {
      $('plantName').value = 'Riverside Regional Water Utility';
      $('plantName').dispatchEvent(new Event('input'));
    }
    renderBOM(); renderZones(); renderConn();
    setStatus('bomStatus', `Loaded sample BOM: ${state.bom.length} assets, ${state.zones.length} zones, ${state.conn.length} conduits.`, false);
  });
}

function addBOMRow(initial = {}) {
  state.bom.push({
    asset_id: '', name: '', asset_type: 'plc', essential_function: '',
    vendor: '', model: '', firmware_version: '',
    ip_address: '', zone_id: '', criticality_score: 5, process_tag: '',
    ...initial,
  });
}

function renderBOM() {
  const tbody = $('bomBody');
  tbody.innerHTML = state.bom.map((row, i) => {
    const needsVendor = !!row.asset_id && !String(row.vendor || '').trim();
    const rowClass = needsVendor ? 'needs-review' : '';
    const reviewBadge = needsVendor ? '<span class="review-flag" title="Vendor not recognized — fill in or this asset will not match advisories">!</span>' : '';
    const inferredFn = inferAssetFunction(row);
    return `
    <tr data-i="${i}" class="${rowClass}">
      <td><input data-f="asset_id" value="${escape(row.asset_id)}" placeholder="a_plc_01">${reviewBadge}</td>
      <td><input data-f="name" value="${escape(row.name)}" placeholder="Treatment PLC"></td>
      <td>
        <select data-f="asset_type">
          ${ASSET_TYPES.map(t => `<option value="${t}" ${t === row.asset_type ? 'selected' : ''}>${t}</option>`).join('')}
        </select>
      </td>
      <td><input data-f="essential_function" value="${escape(row.essential_function)}" placeholder="${escape(inferredFn)}" title="Inferred placeholder shown — type to override"></td>
      <td><input data-f="vendor" value="${escape(row.vendor)}" placeholder="${needsVendor ? 'needs review' : '—'}" title="${escape(row._vendor_evidence || '')}"></td>
      <td><input data-f="model" value="${escape(row.model)}" placeholder="—"></td>
      <td><input data-f="firmware_version" value="${escape(row.firmware_version)}" placeholder="—"></td>
      <td><input data-f="ip_address" value="${escape(row.ip_address)}" placeholder="—"></td>
      <td><input data-f="zone_id" value="${escape(row.zone_id)}" placeholder="—"></td>
      <td><input data-f="criticality_score" type="number" min="1" max="10" value="${row.criticality_score}"></td>
      <td><input data-f="process_tag" value="${escape(row.process_tag)}" placeholder="filtration_control"></td>
      <td class="row-action"><button title="remove" data-action="rm">×</button></td>
    </tr>`;
  }).join('');
  tbody.querySelectorAll('tr').forEach(tr => {
    const i = Number(tr.dataset.i);
    tr.querySelectorAll('input, select').forEach(el => {
      el.addEventListener('input', () => {
        const f = el.dataset.f;
        let v = el.value;
        if (f === 'criticality_score') v = Number(v) || 0;
        state.bom[i][f] = v;
        // Clear the needs-review flag once vendor is filled.
        if (f === 'vendor') {
          if (String(v).trim()) tr.classList.remove('needs-review');
          else tr.classList.add('needs-review');
          updateBomMeta();
        }
      });
    });
    tr.querySelector('[data-action="rm"]').addEventListener('click', () => {
      state.bom.splice(i, 1);
      renderBOM();
    });
  });
  updateBomMeta();
}

function updateBomMeta() {
  const total = state.bom.length;
  const needsReview = state.bom.filter(a => a.asset_id && !String(a.vendor || '').trim()).length;
  const meta = $('bomMeta');
  if (!meta) return;
  if (needsReview) {
    meta.innerHTML = `${total} asset${total === 1 ? '' : 's'} · <span class="review-count">${needsReview} need vendor review</span>`;
  } else {
    meta.textContent = `${total} asset${total === 1 ? '' : 's'}`;
  }
}

// ── zone table ──────────────────────────────────────────────────────────

function bindZoneToolbar() {
  $('zoneAddRow').addEventListener('click', () => { addZoneRow(); renderZones(); });
}

function addZoneRow(initial = {}) {
  state.zones.push({ zone_id: '', name: '', level: 'L2', description: '', ...initial });
}

function renderZones() {
  const tbody = $('zoneBody');
  tbody.innerHTML = state.zones.map((row, i) => `
    <tr data-i="${i}">
      <td><input data-f="zone_id" value="${escape(row.zone_id)}" placeholder="z_process"></td>
      <td><input data-f="name" value="${escape(row.name)}" placeholder="Process Control"></td>
      <td>
        <select data-f="level">
          ${['L0','L1','L2','L3','L3.5','L4'].map(l => `<option ${l === row.level ? 'selected' : ''}>${l}</option>`).join('')}
        </select>
      </td>
      <td><input data-f="description" value="${escape(row.description)}" placeholder="PLCs and safety controllers"></td>
      <td class="row-action"><button title="remove" data-action="rm">×</button></td>
    </tr>`).join('');
  tbody.querySelectorAll('tr').forEach(tr => {
    const i = Number(tr.dataset.i);
    tr.querySelectorAll('input, select').forEach(el => {
      el.addEventListener('input', () => { state.zones[i][el.dataset.f] = el.value; });
    });
    tr.querySelector('[data-action="rm"]').addEventListener('click', () => {
      state.zones.splice(i, 1);
      renderZones();
    });
  });
  $('zoneMeta').textContent = `${state.zones.length} zone${state.zones.length === 1 ? '' : 's'}`;
}

// ── connectivity table ──────────────────────────────────────────────────

function bindConnToolbar() {
  $('connAddRow').addEventListener('click', () => { addConnRow(); renderConn(); });
}

function addConnRow(initial = {}) {
  state.conn.push({
    source_asset_id: '', target_asset_id: '',
    protocol: 'ethernet-ip', port: 44818,
    trust_level: 'high', allowed_direction: 'bi',
    ...initial,
  });
}

function renderConn() {
  const tbody = $('connBody');
  const protoOptions = ['opc-ua','modbus-tcp','ethernet-ip','s7','dnp3','profinet','https','http','tcp'];
  tbody.innerHTML = state.conn.map((row, i) => `
    <tr data-i="${i}">
      <td><input data-f="source_asset_id" value="${escape(row.source_asset_id)}"></td>
      <td><input data-f="target_asset_id" value="${escape(row.target_asset_id)}"></td>
      <td>
        <select data-f="protocol">
          ${protoOptions.map(p => `<option value="${p}" ${p === row.protocol ? 'selected' : ''}>${p}</option>`).join('')}
        </select>
      </td>
      <td><input data-f="port" type="number" value="${row.port}"></td>
      <td>
        <select data-f="trust_level">
          ${TRUST_LEVELS.map(t => `<option value="${t}" ${t === row.trust_level ? 'selected' : ''}>${t}</option>`).join('')}
        </select>
      </td>
      <td>
        <select data-f="allowed_direction">
          ${DIRECTIONS.map(d => `<option value="${d}" ${d === row.allowed_direction ? 'selected' : ''}>${d}</option>`).join('')}
        </select>
      </td>
      <td class="row-action"><button title="remove" data-action="rm">×</button></td>
    </tr>`).join('');
  tbody.querySelectorAll('tr').forEach(tr => {
    const i = Number(tr.dataset.i);
    tr.querySelectorAll('input, select').forEach(el => {
      el.addEventListener('input', () => {
        let v = el.value;
        if (el.dataset.f === 'port') v = Number(v) || 0;
        state.conn[i][el.dataset.f] = v;
      });
    });
    tr.querySelector('[data-action="rm"]').addEventListener('click', () => {
      state.conn.splice(i, 1);
      renderConn();
    });
  });
  $('connMeta').textContent = `${state.conn.length} conduit${state.conn.length === 1 ? '' : 's'}`;
}

// ── BOM file uploader (CSV / DOCX / PDF) ────────────────────────────────

function bindBOMUploader() {
  const drop = $('bomDrop');
  const input = $('bomFile');
  ['dragenter','dragover'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.add('is-drag'); }));
  ['dragleave','drop'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.remove('is-drag'); }));
  drop.addEventListener('drop', (e) => { if (e.dataTransfer?.files?.[0]) handleBOMFile(e.dataTransfer.files[0]); });
  input.addEventListener('change', () => { if (input.files?.[0]) handleBOMFile(input.files[0]); });
}

async function handleBOMFile(file) {
  setStatus('bomStatus', `Parsing ${file.name} (${(file.size/1024).toFixed(1)} KB)…`, false);
  try {
    const ext = (file.name.split('.').pop() || '').toLowerCase();
    let rows = [];
    if (ext === 'csv' || ext === 'txt') {
      rows = parseCSV(await file.text());
    } else if (ext === 'docx') {
      rows = await parseDOCX(file);
    } else if (ext === 'pdf') {
      const extracted = await extractAssetsFromPDF(file);
      if (!extracted.assets.length) throw new Error('No asset-like tables extracted from the PDF. Try a CSV export or a more inventory-like document.');
      state.bom = extracted.assets;
      renderBOM();
      const vendorNote = extracted.vendorSummary
        ? ` Vendor recognition: ${extracted.vendorSummary.tagged}/${extracted.vendorSummary.total} tagged (${Math.round(extracted.vendorSummary.coverage * 100)}%).`
        : '';
      setStatus(
        'bomStatus',
        `Extracted ${extracted.assets.length} asset rows from ${file.name} across ${extracted.tableCount} PDF table candidates. Mapped columns: ${extracted.mappedColumns.join(', ') || 'none'}.${vendorNote} Review and correct any wrong values.`,
        false
      );
      return;
    } else {
      throw new Error(`Unsupported file type .${ext}. Use .csv, .docx, or .pdf.`);
    }
    if (!rows.length) throw new Error('No table rows extracted. Check the file or paste a CSV manually.');
    const mapped = mapRowsToAssets(rows);
    state.bom = mapped.assets;
    renderBOM();
    setStatus('bomStatus',
      `Extracted ${mapped.assets.length} rows from ${file.name}. Mapped columns: ${mapped.mappedColumns.join(', ') || 'none'}. Review and correct any wrong values.`,
      false);
  } catch (err) {
    setStatus('bomStatus', `Failed to parse ${file.name}: ${err.message}`, true);
  }
}

// CSV — handles double-quoted fields with embedded commas. Returns array of
// arrays; the first row is treated as headers downstream.
function parseCSV(text) {
  const rows = [];
  let row = [], field = '', inQuote = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuote) {
      if (c === '"' && text[i+1] === '"') { field += '"'; i++; }
      else if (c === '"') inQuote = false;
      else field += c;
    } else {
      if (c === '"') inQuote = true;
      else if (c === ',') { row.push(field); field = ''; }
      else if (c === '\r') { /* skip */ }
      else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
      else field += c;
    }
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  return rows.filter(r => r.some(cell => String(cell).trim() !== ''));
}

// DOCX — mammoth converts the document to HTML, then we walk the tables.
async function parseDOCX(file) {
  if (typeof mammoth === 'undefined') throw new Error('mammoth.js failed to load from CDN');
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.convertToHtml({ arrayBuffer });
  const doc = new DOMParser().parseFromString(result.value, 'text/html');
  // Pick the largest table, on the assumption the BOM is the dominant table
  const tables = [...doc.querySelectorAll('table')];
  if (!tables.length) throw new Error('No tables found in document');
  tables.sort((a, b) => b.querySelectorAll('tr').length - a.querySelectorAll('tr').length);
  const bestTable = tables[0];
  const rows = [...bestTable.querySelectorAll('tr')].map(tr =>
    [...tr.querySelectorAll('th, td')].map(td => td.textContent.replace(/\s+/g, ' ').trim())
  );
  return rows.filter(r => r.some(cell => cell.length > 0));
}

// PDF — pdf.js gives positioned text per page. Mirror of the Node-side
// extract-bom.mjs parser. Strips repeating page-level boilerplate, clusters
// text into per-page lines by y-coordinate, then detects table regions by
// looking for runs of >=3 lines that share column-x positions AND have a
// header row containing recognizable column-name tokens. False positives
// (narrative paragraphs that happen to align) are rejected.
async function parsePDF(file) {
  if (!window.pdfjsLib) await loadPDFjs();
  const pdfjsLib = window.pdfjsLib;
  const buf = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buf }).promise;

  // Step 1 — extract per-page lines with column-x positions
  const pages = [];
  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p);
    const content = await page.getTextContent();
    const items = content.items.map(it => ({ str: it.str, x: it.transform[4], y: it.transform[5] }));
    pages.push(positionedToLines(items));
  }

  // Step 2 — strip lines that repeat across >40% of pages (running headers/footers)
  const boilerplate = detectBoilerplate(pages);
  const cleaned = pages.map(lines => lines.filter(line => !boilerplate.has(normLineText(line.text))));

  // Step 3 — locate table regions on each page
  const allTableRows = [];
  for (const lines of cleaned) {
    for (const t of detectTables(lines)) {
      allTableRows.push([t.headers, ...t.rows]);
    }
  }

  // Return the LARGEST table found. The auto-mapper downstream picks columns.
  if (allTableRows.length === 0) return [];
  allTableRows.sort((a, b) => b.length - a.length);
  return allTableRows[0];
}

async function extractAssetsFromPDF(file) {
  if (!window.pdfjsLib) await loadPDFjs();
  const pdfjsLib = window.pdfjsLib;
  const buf = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buf }).promise;

  const pages = [];
  const allTextLines = [];
  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p);
    const content = await page.getTextContent();
    const items = content.items.map(it => ({ str: it.str, x: it.transform[4], y: it.transform[5] }));
    pages.push(positionedToLines(items));
  }

  const boilerplate = detectBoilerplate(pages);
  const cleaned = pages.map(lines => lines.filter(line => !boilerplate.has(normLineText(line.text))));
  for (const page of cleaned) {
    for (const line of page) {
      if (line.text) allTextLines.push(line.text);
    }
  }
  const tableRows = [];
  for (const lines of cleaned) {
    for (const t of detectTables(lines)) {
      tableRows.push([t.headers, ...t.rows]);
    }
  }

  const candidateAssets = [];
  const mappedColumns = new Set();
  for (const rows of tableRows) {
    const mapped = mapRowsToAssets(rows);
    const filtered = mapped.assets.filter(isLikelyAssetRow);
    if (!filtered.length) continue;
    const score = scoreAssetTable(rows[0], filtered);
    if (score < 2) continue;
    mapped.mappedColumns.forEach(col => mappedColumns.add(col));
    candidateAssets.push(...filtered);
  }

  const topology = inferTopologyFromLines(allTextLines, candidateAssets);
  const zoneByAssetId = new Map(topology.matchedAssets.map(match => [match.asset_id, match.zone_id]));
  for (const asset of candidateAssets) {
    if (!asset.zone_id && zoneByAssetId.has(asset.asset_id)) asset.zone_id = zoneByAssetId.get(asset.asset_id);
  }

  const mergedAssets = [...candidateAssets, ...topology.suggestedAssets.filter(isLikelyAssetRow)];
  const deduped = sortAssetsForReview(dedupeAssets(mergedAssets));

  const tagged = tagAssetsFromPdfLines(allTextLines, deduped, topology.zones || []);

  return {
    assets: tagged.assets,
    mappedColumns: [...mappedColumns],
    tableCount: tableRows.length,
    vendorSummary: tagged.summary,
  };
}

function positionedToLines(items) {
  items.sort((a, b) => b.y - a.y || a.x - b.x);
  const lines = [];
  let curY = null, group = [];
  for (const it of items) {
    if (curY === null || Math.abs(it.y - curY) > 2.5) {
      if (group.length) lines.push(toLine(group));
      group = [it]; curY = it.y;
    } else group.push(it);
  }
  if (group.length) lines.push(toLine(group));
  return lines;
}

function toLine(items) {
  items.sort((a, b) => a.x - b.x);
  const cols = [];
  let cur = items[0]?.str || '';
  let curStartX = items[0]?.x || 0;
  for (let i = 1; i < items.length; i++) {
    const prev = items[i - 1];
    const it = items[i];
    const gap = it.x - (prev.x + prev.str.length * 5);
    if (gap > 14) {
      cols.push({ text: cur.trim(), x: curStartX });
      cur = it.str; curStartX = it.x;
    } else {
      cur += (cur && !cur.endsWith(' ') ? ' ' : '') + it.str;
    }
  }
  cols.push({ text: cur.trim(), x: curStartX });
  return {
    text: cols.map(c => c.text).join('  |  '),
    cols: cols.filter(c => c.text.length > 0),
  };
}

function normLineText(t) { return t.replace(/\s+/g, ' ').trim().toLowerCase(); }

function detectBoilerplate(pages) {
  const counts = new Map();
  for (const lines of pages) {
    const seen = new Set();
    for (const line of lines) {
      const k = normLineText(line.text);
      if (k.length < 4 || k.length > 200 || seen.has(k)) continue;
      seen.add(k);
      counts.set(k, (counts.get(k) || 0) + 1);
    }
  }
  const threshold = Math.max(3, Math.floor(pages.length * 0.4));
  const out = new Set();
  for (const [k, c] of counts) if (c >= threshold) out.add(k);
  return out;
}

const HEADER_TOKEN_HINTS = new Set([
  'assetid','tag','tagname','letterbug','wsname','name','device','model','modelno','modelnumber',
  'vendor','manufacturer','make','mfr','supplier','ip','ipaddress','zone','vlan','subnet','network',
  'type','function','description','firewall','switch','server','host','controller','level','location',
  'id','port','protocol','priority','criticality','sl',
]);

function detectTables(lines) {
  const tables = [];
  let i = 0;
  const looksLikeHeader = (cols) => {
    const cells = cols.map(c => c.text || '');
    if (!cells.every(c => c.length > 0 && c.length <= 40)) return false;
    let hits = 0;
    for (const h of cells.map(c => c.toLowerCase().replace(/[^a-z0-9]/g, ''))) {
      for (const hint of HEADER_TOKEN_HINTS) {
        if (h.includes(hint)) { hits++; break; }
      }
    }
    return hits >= 2;
  };
  while (i < lines.length) {
    if (!lines[i].cols || lines[i].cols.length < 3) { i++; continue; }
    const xs = lines[i].cols.map(c => c.x);
    let j = i + 1;
    const runRows = [lines[i]];
    while (j < lines.length) {
      const cand = lines[j];
      if (matchesColumnPattern(cand.cols, xs)) { runRows.push(cand); j++; }
      else if (cand.cols && cand.cols.length <= 2 && runRows.length > 0) {
        const prev = runRows[runRows.length - 1];
        const last = prev.cols[prev.cols.length - 1];
        if (last) last.text += ' ' + cand.cols.map(c => c.text).join(' ');
        prev.text = prev.cols.map(c => c.text).join('  |  ');
        j++;
      } else break;
    }
    if (runRows.length >= 3 && looksLikeHeader(runRows[0].cols)) {
      const headers = runRows[0].cols.map(c => c.text);
      const rows = runRows.slice(1).map(r => {
        const filled = new Array(headers.length).fill('');
        for (const c of r.cols) {
          const idx = nearestColIndex(c.x, xs);
          filled[idx] = filled[idx] ? filled[idx] + ' ' + c.text : c.text;
        }
        return filled;
      });
      tables.push({ headers, rows });
      i = j;
    } else i++;
  }
  return tables;
}

function matchesColumnPattern(cols, xs) {
  if (cols.length < Math.max(2, xs.length - 1)) return false;
  let matched = 0;
  for (const c of cols) if (xs.some(x => Math.abs(x - c.x) <= 10)) matched++;
  return matched >= Math.min(cols.length, xs.length) - 1;
}

function nearestColIndex(x, xs) {
  let best = 0, dist = Infinity;
  for (let i = 0; i < xs.length; i++) {
    const d = Math.abs(x - xs[i]);
    if (d < dist) { dist = d; best = i; }
  }
  return best;
}

async function loadPDFjs() {
  // Lazy-load pdf.js from CDN. Worker URL must be set explicitly.
  await new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.0.379/build/pdf.min.mjs';
    s.type = 'module';
    s.onload = resolve;
    s.onerror = () => reject(new Error('Failed to load pdf.js from CDN'));
    document.head.appendChild(s);
  });
  // pdf.js exposes pdfjsLib on globalThis when loaded as ES module via this CDN
  // Wait briefly for it to register
  for (let i = 0; i < 30 && !window.pdfjsLib; i++) await new Promise(r => setTimeout(r, 100));
  if (!window.pdfjsLib) throw new Error('pdf.js loaded but pdfjsLib global not found');
  window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.0.379/build/pdf.worker.min.mjs';
}

// Auto-map raw rows (first row = headers) to asset objects.
function mapRowsToAssets(rows) {
  if (rows.length < 2) {
    // Single row — treat all as one asset, unmapped
    const singleName = rows[0]?.join(' ') || '';
    const single = { asset_id: '', name: singleName, vendor: '', model: '', firmware_version: '', ip_address: '', zone_id: '', criticality_score: 5, process_tag: '', asset_type: inferAssetTypeFromText(singleName, 'scada-server') };
    return { assets: [single], mappedColumns: [] };
  }
  const headers = rows[0].map(h => normalizeHeader(h));
  const colMap = {};   // assetField -> headerIndex
  const mappedColumns = [];
  for (const [field, aliases] of Object.entries(HEADER_ALIASES)) {
    for (let i = 0; i < headers.length; i++) {
      if (aliases.some(alias => headers[i].includes(alias))) {
        if (colMap[field] === undefined) {
          colMap[field] = i;
          mappedColumns.push(`${rows[0][i]} → ${field}`);
          break;
        }
      }
    }
  }
  const assets = [];
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    const a = {
      asset_id: '', name: '', asset_type: '',
      vendor: '', model: '', firmware_version: '',
      ip_address: '', zone_id: '', criticality_score: 5, process_tag: '',
    };
    for (const [field, idx] of Object.entries(colMap)) {
      let v = row[idx] ?? '';
      if (field === 'criticality_score') v = Math.max(1, Math.min(10, Number(v) || 5));
      a[field] = v;
    }
    if (!a.asset_id) a.asset_id = `a_${slugify(a.name || a.vendor || `asset_${r}`).slice(0, 24)}`;
    if (!a.name && a.vendor && a.model) a.name = `${a.vendor} ${a.model}`;
    if (!a.asset_type) a.asset_type = inferAssetTypeFromText([a.name, a.vendor, a.model, a.process_tag, ...row].filter(Boolean).join(' '), 'scada-server');
    assets.push(a);
  }
  return { assets, mappedColumns };
}

function normalizeHeader(h) {
  return String(h || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

const NON_ASSET_TEXT_RE = /\b(exclude path|skip registry|write protection|file operations|registry protection|ignore path|protection rules?)\b/i;
const ASSET_SIGNAL_RE = /\b(server|workstation|switch|firewall|controller|plc|hmi|rtu|nas|vm|domain controller|radius|histori|thin client|foxboro|fortigate|connexium)\b/i;

function isLikelyAssetRow(asset) {
  const text = [asset.asset_id, asset.name, asset.vendor, asset.model, asset.process_tag].filter(Boolean).join(' ');
  if (!text.trim()) return false;
  if (NON_ASSET_TEXT_RE.test(text)) return false;
  return ASSET_SIGNAL_RE.test(text) || !!asset.ip_address;
}

function scoreAssetTable(headers, assets) {
  const headerText = (headers || []).join(' ');
  if (NON_ASSET_TEXT_RE.test(headerText)) return -5;
  let score = 0;
  if (ASSET_SIGNAL_RE.test(headerText)) score += 2;
  const names = new Set(assets.map(asset => `${asset.name}|${asset.model}`));
  score += Math.min(4, names.size / 2);
  const types = new Set(assets.map(asset => asset.asset_type).filter(Boolean));
  score += Math.min(3, types.size);
  if (assets.some(asset => asset.name)) score += 1;
  return score;
}

function dedupeAssets(assets) {
  const seen = new Set();
  const out = [];
  for (const asset of assets) {
    const key = `${String(asset.name || '').trim().toLowerCase()}|${String(asset.model || '').trim().toLowerCase()}|${asset.asset_type}|${String(asset.zone_id || '').trim().toLowerCase()}`;
    if (!key.replace(/\|/g, '').trim() || seen.has(key)) continue;
    seen.add(key);
    out.push(asset);
  }
  return out;
}

function sortAssetsForReview(assets) {
  const rank = {
    'scada-server': 0,
    'historian': 1,
    'engineering-workstation': 2,
    'hmi': 3,
    'plc': 4,
    'safety-controller': 5,
    'rtu': 6,
    'firewall': 7,
    'switch': 8,
  };
  return [...assets].sort((a, b) => {
    const ra = rank[a.asset_type] ?? 99;
    const rb = rank[b.asset_type] ?? 99;
    if (ra !== rb) return ra - rb;
    return String(a.name || a.asset_id || '').localeCompare(String(b.name || b.asset_id || ''));
  });
}

// ── drawing uploader ────────────────────────────────────────────────────

function bindDrawingUploader() {
  const drop = $('drawingDrop');
  const input = $('drawingFile');
  ['dragenter','dragover'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.add('is-drag'); }));
  ['dragleave','drop'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.remove('is-drag'); }));
  drop.addEventListener('drop', (e) => { if (e.dataTransfer?.files?.[0]) handleDrawing(e.dataTransfer.files[0]); });
  input.addEventListener('change', () => { if (input.files?.[0]) handleDrawing(input.files[0]); });
}

async function handleDrawing(file) {
  const key = $('plantKey').value.trim() || slugify($('plantName').value).split('-')[0] || 'draft';
  setStatus('drawingStatus', `Uploading ${file.name} for plant key "${key}"…`, false);
  try {
    if (file.size > 25 * 1024 * 1024) throw new Error('Drawing exceeds 25 MB cap.');
    const buf = await file.arrayBuffer();
    const uploadBytes = new Uint8Array(buf.slice(0));
    let inferred = null;
    if (/\.pdf$/i.test(file.name)) {
      setStatus('drawingStatus', `Parsing ${file.name} for zones and conduits before upload...`, false);
      inferred = await inferTopologyFromPDF(buf.slice(0));
    }
    const b64 = bytesToBase64(uploadBytes);
    const res = await fetch('/api/onboarding/drawing', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ plant_key: key, filename: file.name, content_type: file.type, content_base64: b64 }),
    });
    const json = await res.json();
    if (!json.ok) throw new Error(json.error || `HTTP ${res.status}`);
    state.drawings.push({ url: json.url, name: file.name, size: json.bytes, content_type: json.content_type });
    const mergeSummary = inferred ? mergeInferredTopology(inferred) : null;
    if (mergeSummary?.applied) {
      renderDrawings();
      const vs = mergeSummary.vendorSummary;
      const vendorMsg = vs ? ` Vendor recognition: ${vs.tagged}/${vs.total} (${Math.round(vs.coverage * 100)}%) tagged.` : '';
      setStatus(
        'drawingStatus',
        `Uploaded ${file.name}. Inferred ${mergeSummary.zones} zones, ${mergeSummary.assets} assets, and ${mergeSummary.conduits} conduits.${vendorMsg} Review Steps 2-4 before saving.`,
        false
      );
      return;
    }
    renderDrawings();
    setStatus('drawingStatus', `Uploaded ${file.name} → ${json.url}`, false);
  } catch (err) {
    setStatus('drawingStatus', `Upload failed: ${err.message}`, true);
  }
}

function renderDrawings() {
  const list = $('drawingList');
  if (!state.drawings.length) { list.innerHTML = ''; return; }
  list.innerHTML = state.drawings.map(d => {
    const isImage = (d.content_type || '').startsWith('image/') || /\.(png|jpe?g|svg)$/i.test(d.name);
    return `
    <div class="ob-attach">
      <div class="thumb">${isImage ? `<img src="${escape(d.url)}" alt="${escape(d.name)}" />` : 'PDF'}</div>
      <div class="name">${escape(d.name)}<div class="size">${(d.size/1024).toFixed(1)} KB · <a href="${escape(d.url)}" target="_blank" rel="noopener">open</a></div></div>
      <div></div>
    </div>`;
  }).join('');
}

function bytesToBase64(bytes) {
  let s = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    s += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
  }
  return btoa(s);
}

async function inferTopologyFromPDF(buffer) {
  if (!window.pdfjsLib) await loadPDFjs();
  const pdfjsLib = window.pdfjsLib;
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
  const pages = [];

  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p);
    const content = await page.getTextContent();
    const items = content.items.map(it => ({ str: it.str, x: it.transform[4], y: it.transform[5] }));
    pages.push(positionedToLines(items));
  }

  const boilerplate = detectBoilerplate(pages);
  const lines = pages
    .flatMap(page => page.filter(line => !boilerplate.has(normLineText(line.text))))
    .map(line => line.text)
    .filter(Boolean);

  const topology = inferTopologyFromLines(lines, state.bom);
  // Tag both suggested and matched assets with vendor recognition from the
  // PDF's full text, using the zone context to disambiguate.
  const allInferredAssets = [...topology.suggestedAssets];
  const tagged = tagAssetsFromPdfLines(lines, allInferredAssets, topology.zones || []);
  topology.suggestedAssets = tagged.assets;
  topology._vendorSummary = tagged.summary;
  topology._extractedLines = lines;
  return topology;
}

function mergeInferredTopology(topology) {
  if (!topology) return { applied: false, zones: 0, assets: 0, conduits: 0 };

  if (topology.suggestedAssets.length || topology.matchedAssets.length) {
    state.bom = state.bom.filter(hasMeaningfulAssetRow);
  }
  if (topology.connectivity.length) {
    state.conn = state.conn.filter(conn => conn.source_asset_id || conn.target_asset_id);
  }

  let addedZones = 0;
  let addedAssets = 0;
  let addedConduits = 0;

  const zoneIds = new Set(state.zones.map(zone => zone.zone_id));
  for (const zone of topology.zones) {
    if (!zone.zone_id || zoneIds.has(zone.zone_id)) continue;
    state.zones.push({ ...zone });
    zoneIds.add(zone.zone_id);
    addedZones += 1;
  }

  const assetById = new Map(state.bom.map(asset => [asset.asset_id, asset]));
  for (const match of topology.matchedAssets) {
    const existing = assetById.get(match.asset_id);
    if (!existing) continue;
    if (!existing.zone_id) existing.zone_id = match.zone_id;
    if (!existing.name && match.suggested_name) existing.name = match.suggested_name;
  }

  const assetKeys = new Set(state.bom.map(asset => topologyAssetKey(asset)));
  for (const asset of topology.suggestedAssets) {
    const key = topologyAssetKey(asset);
    if (!asset.asset_id || assetKeys.has(key)) continue;
    state.bom.push({ ...asset });
    assetKeys.add(key);
    addedAssets += 1;
  }

  const liveAssetIds = new Set(state.bom.map(asset => asset.asset_id).filter(Boolean));
  const conduitKeys = new Set(state.conn.map(conn => connKey(conn)));
  for (const conn of topology.connectivity) {
    if (!liveAssetIds.has(conn.source_asset_id) || !liveAssetIds.has(conn.target_asset_id)) continue;
    const key = connKey(conn);
    if (conduitKeys.has(key)) continue;
    state.conn.push({ ...conn });
    conduitKeys.add(key);
    addedConduits += 1;
  }

  // Re-run vendor recognition over the full BOM with the drawing's lines,
  // so existing rows that lacked a vendor get tagged from this PDF's context.
  if (topology._extractedLines && topology._extractedLines.length) {
    const retagged = tagAssetsFromPdfLines(topology._extractedLines, state.bom, state.zones);
    state.bom = retagged.assets;
  }

  renderBOM();
  renderZones();
  renderConn();

  return {
    applied: addedZones > 0 || addedAssets > 0 || addedConduits > 0 || topology.matchedAssets.length > 0,
    zones: addedZones,
    assets: addedAssets + topology.matchedAssets.length,
    conduits: addedConduits,
    vendorSummary: topology._vendorSummary,
  };
}

function hasMeaningfulAssetRow(asset) {
  if (!asset) return false;
  const assetId = String(asset.asset_id || '').trim();
  return !!(
    String(asset.name || '').trim() ||
    String(asset.vendor || '').trim() ||
    String(asset.model || '').trim() ||
    String(asset.ip_address || '').trim() ||
    String(asset.zone_id || '').trim() ||
    String(asset.process_tag || '').trim() ||
    (assetId && !/^a_asset[-_]/i.test(assetId))
  );
}

function topologyAssetKey(asset) {
  return `${asset.zone_id || ''}::${String(asset.name || '').trim().toLowerCase()}::${asset.asset_type || ''}`;
}

function connKey(conn) {
  return `${conn.source_asset_id}::${conn.target_asset_id}::${conn.protocol}::${conn.port}`;
}

// ── save ────────────────────────────────────────────────────────────────

function bindSave() {
  $('saveBtn').addEventListener('click', save);
  $('downloadBtn').addEventListener('click', () => {
    const json = JSON.stringify(buildPlant(), null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${$('plantId').value || 'plant'}.json`;
    a.click();
  });
  $('previewBtn').addEventListener('click', () => {
    const box = $('previewBox');
    if (box.style.display === 'none') {
      box.textContent = JSON.stringify(buildPlant(), null, 2);
      box.style.display = 'block';
      $('previewBtn').textContent = 'hide preview';
    } else {
      box.style.display = 'none';
      $('previewBtn').textContent = 'Preview JSON';
    }
  });
}

function buildPlant() {
  return {
    plant_id:   $('plantId').value.trim() || `plant-${slugify($('plantName').value).split('-')[0] || 'draft'}`,
    plant_name: $('plantName').value.trim() || 'Untitled Plant',
    sector:     $('plantSector').value,
    onboarding_key: $('plantKey').value.trim() || slugify($('plantName').value).split('-')[0] || 'draft',
    zones:      state.zones.filter(z => z.zone_id).map(z => ({ ...z })),
    assets:     state.bom.filter(a => a.asset_id).map(a => ({
                  ...a,
                  criticality_score: Number(a.criticality_score) || 0,
                })),
    connectivity: state.conn.filter(c => c.source_asset_id && c.target_asset_id).map(c => ({
                  ...c, port: Number(c.port) || 0,
                })),
    process_functions: [],
    demo_scenarios: [],
    onboarding_meta: {
      saved_at: new Date().toISOString(),
      drawings: state.drawings.map(d => ({ name: d.name, url: d.url, size: d.size })),
    },
  };
}

async function save({ confirmOverwrite = false } = {}) {
  const plant = buildPlant();
  if (!plant.plant_name || plant.plant_name === 'Untitled Plant') {
    setStatus('saveStatus', 'Plant name is required.', true);
    return;
  }
  if (plant.assets.length === 0) {
    setStatus('saveStatus', 'At least one asset is required.', true);
    return;
  }
  // Warn before save if any extracted asset still lacks a vendor — the
  // operator may want to fill them in first, but can proceed.
  const emptyVendor = state.bom.filter(a => a.asset_id && !String(a.vendor || '').trim()).length;
  if (emptyVendor && !confirmOverwrite) {
    const proceed = confirm(
      `${emptyVendor} of ${state.bom.length} assets have no vendor recognized. ` +
      `These will save as-is and will not match any CISA advisories until you fill them in.\n\n` +
      `Save anyway?`
    );
    if (!proceed) {
      setStatus('saveStatus', `Save cancelled. ${emptyVendor} asset rows highlighted for review.`, true);
      return;
    }
  }
  if (confirmOverwrite) plant.confirm_overwrite = true;
  setStatus('saveStatus', `Saving plant fixture (${plant.assets.length} assets, ${plant.zones.length} zones, ${plant.connectivity.length} conduits)…`, false);
  try {
    const res = await fetch('/api/onboarding/save', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(plant),
    });
    if (res.status === 409) {
      const conflict = await res.json();
      if (conflict.builtin) {
        setStatus('saveStatus', conflict.message, true);
        return;
      }
      const meta = conflict.existing || {};
      const proceed = confirm(
        `Plant key "${plant.onboarding_key}" already exists.\n\n` +
        `Existing: ${meta.plant_name || '(unknown)'}, ${meta.asset_count || 0} assets` +
        (meta.saved_at ? ` (saved ${meta.saved_at.slice(0, 10)})` : '') + `.\n\n` +
        `Overwrite? Manual edits to vendor/model on the existing plant will be lost.`
      );
      if (!proceed) {
        setStatus('saveStatus', `Save cancelled. Change the plant key to keep both, or click Save again to overwrite.`, true);
        return;
      }
      return save({ confirmOverwrite: true });
    }
    const json = await res.json();
    if (!json.ok) throw new Error(json.error || `HTTP ${res.status}`);
    const adv = json.advisories;
    const advMsg = adv
      ? ` Advisories matched: ${adv.advisories_matched} (${adv.kev_hits} KEV) across ${adv.assets_matched}/${adv.assets_total} assets.`
      : '';
    const gapMsg = (adv && adv.vendors_recognized_no_match && adv.vendors_recognized_no_match.length)
      ? ` Vendors with no feed coverage: ${adv.vendors_recognized_no_match.slice(0, 5).join(', ')} (CISA ICS-CERT scope gap — not all OT/IT vendors are covered).`
      : '';
    setStatus('saveStatus',
      `Saved! Plant key "${json.key}" with ${json.assets} assets.${advMsg}${gapMsg} Wrote ${json.paths.demo} and ${json.paths.enriched}. Switching to that plant…`,
      false);
    setPlantKey(json.key);
    setTimeout(() => { location.href = '/index.html'; }, 1200);
  } catch (err) {
    setStatus('saveStatus', `Save failed: ${err.message}`, true);
  }
}

// ── status helper ───────────────────────────────────────────────────────

function setStatus(id, msg, isError) {
  const el = $(id);
  el.textContent = msg;
  el.classList.add('show');
  el.classList.toggle('is-error', !!isError);
}

// ── samples (from the existing energy/water fixtures, simplified) ───────

function sampleBOM() {
  return [
    { asset_id: 'a_scada_01', name: 'SCADA Primary',                 asset_type: 'scada-server',         vendor: 'AVEVA',           model: 'System Platform',     firmware_version: '2023 R2', ip_address: '10.40.3.10', zone_id: 'z_ops',       criticality_score: 9,  process_tag: 'plant_dispatch' },
    { asset_id: 'a_hist_01',  name: 'Plant Historian',               asset_type: 'historian',            vendor: 'AVEVA',           model: 'Historian',           firmware_version: '2023.2',  ip_address: '10.40.3.20', zone_id: 'z_ops',       criticality_score: 8,  process_tag: 'compliance_data' },
    { asset_id: 'a_hmi_01',   name: 'Operator HMI',                  asset_type: 'hmi',                  vendor: 'Rockwell',        model: 'FactoryTalk View SE', firmware_version: '13.0',    ip_address: '10.40.2.15', zone_id: 'z_treatment', criticality_score: 9,  process_tag: 'treatment_operator' },
    { asset_id: 'a_eng_01',   name: 'Engineering Workstation',       asset_type: 'engineering-workstation', vendor: 'Rockwell',     model: 'Studio 5000',         firmware_version: '35.00',   ip_address: '10.40.2.30', zone_id: 'z_treatment', criticality_score: 7,  process_tag: 'logic_changes' },
    { asset_id: 'a_plc_01',   name: 'Treatment PLC',                 asset_type: 'plc',                  vendor: 'Allen-Bradley',   model: 'ControlLogix 1756-L75', firmware_version: '33.011', ip_address: '10.40.1.11', zone_id: 'z_process',   criticality_score: 10, process_tag: 'filtration_dosing_control' },
    { asset_id: 'a_sis_01',   name: 'Chemical-Dosing Safety Controller', asset_type: 'safety-controller', vendor: 'Allen-Bradley',  model: 'GuardLogix 5580',     firmware_version: '33.011',  ip_address: '10.40.1.50', zone_id: 'z_process',   criticality_score: 10, process_tag: 'chlorine_residual_safety' },
    { asset_id: 'a_rtu_01',   name: 'Lift Station 7 RTU',            asset_type: 'rtu',                  vendor: 'Schneider',       model: 'SCADAPack 350E',      firmware_version: '8.16',    ip_address: '10.40.5.71', zone_id: 'z_field',     criticality_score: 7,  process_tag: 'sewer_lift_station' },
  ];
}
function sampleZones() {
  return [
    { zone_id: 'z_dmz',       name: 'OT DMZ',                  level: 'L3.5', description: 'Jump server, historian replication, vendor remote access' },
    { zone_id: 'z_ops',       name: 'Control Center',          level: 'L3',   description: 'Primary SCADA and historian' },
    { zone_id: 'z_treatment', name: 'Treatment Plant Floor',   level: 'L2',   description: 'Operator HMI and engineering workstation' },
    { zone_id: 'z_process',   name: 'Process Control',         level: 'L1',   description: 'Treatment PLC and chemical-dosing safety controller' },
    { zone_id: 'z_field',     name: 'Distribution Field',      level: 'L1',   description: 'Lift-station RTUs reaching back via cellular VPN' },
  ];
}
function sampleConn() {
  return [
    { source_asset_id: 'a_scada_01', target_asset_id: 'a_hmi_01',  protocol: 'opc-ua',      port: 4840,  trust_level: 'high',   allowed_direction: 'bi' },
    { source_asset_id: 'a_hmi_01',   target_asset_id: 'a_plc_01',  protocol: 'ethernet-ip', port: 44818, trust_level: 'high',   allowed_direction: 'bi' },
    { source_asset_id: 'a_eng_01',   target_asset_id: 'a_plc_01',  protocol: 'ethernet-ip', port: 44818, trust_level: 'medium', allowed_direction: 'bi' },
    { source_asset_id: 'a_plc_01',   target_asset_id: 'a_sis_01',  protocol: 'ethernet-ip', port: 44818, trust_level: 'medium', allowed_direction: 'uni' },
    { source_asset_id: 'a_hist_01',  target_asset_id: 'a_scada_01',protocol: 'https',       port: 443,   trust_level: 'high',   allowed_direction: 'uni' },
    { source_asset_id: 'a_scada_01', target_asset_id: 'a_rtu_01',  protocol: 'dnp3',        port: 20000, trust_level: 'medium', allowed_direction: 'bi' },
  ];
}
