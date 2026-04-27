const LEVEL_ORDER = {
  L0: 0,
  L1: 1,
  L2: 2,
  L3: 3,
  "L3.5": 3.5,
  L4: 4,
};

const SECTION_RE = /^(?:\d+(?:\.\d+)*\s+)?([A-Za-z][A-Za-z0-9/,&+\- ]+? Zone)\s*(?:\((L\d(?:\.\d+)?)\))?$/i;

const ZONE_LEVEL_HINTS = [
  { re: /\b(dmz|cybersecurity)\b/i, level: "L3.5" },
  { re: /\b(control center|operations|ops)\b/i, level: "L3" },
  { re: /\b(control system|supervisory|hmi)\b/i, level: "L2" },
  { re: /\b(process|controller|plc|sis|fgs|safety)\b/i, level: "L1" },
  { re: /\b(field|instrument|remote)\b/i, level: "L0" },
];

const ASSET_TYPE_HINTS = [
  { re: /\b(histori(?:an|cal))\b/i, asset_type: "historian" },
  { re: /\b(hmi|operator workstation|thin client)\b/i, asset_type: "hmi" },
  { re: /\b(engineering workstation|eng workstation|ews)\b/i, asset_type: "engineering-workstation" },
  { re: /\b(sis|fgs|safety controller)\b/i, asset_type: "safety-controller" },
  { re: /\b(rtu|remote terminal|remote telemetry)\b/i, asset_type: "rtu" },
  { re: /\b(firewall|ngfw|fortigate|connexium)\b/i, asset_type: "firewall" },
  { re: /\b(switch|mesh|pin|vhn)\b/i, asset_type: "switch" },
  { re: /\b(controller|plc)\b/i, asset_type: "plc" },
  { re: /\b(server|domain controller|radius|wsus|nas|vm|virtual host|epo|log server|ca server|ntp)\b/i, asset_type: "scada-server" },
];

const IGNORE_DESCRIPTOR_RE = /\b(unused|printers?|ports?)\b/i;

export function inferTopologyFromText(text, existingAssets = []) {
  const lines = String(text || "")
    .split(/\r?\n/)
    .map(cleanLine)
    .filter(Boolean);
  return inferTopologyFromLines(lines, existingAssets);
}

export function inferTopologyFromLines(lines, existingAssets = []) {
  const cleanLines = (lines || []).map(cleanLine).filter(Boolean);
  const sections = extractZoneSections(cleanLines);
  const zones = dedupeByKey(
    [...extractZoneTable(cleanLines), ...sections.map(sectionToZone)].filter(Boolean),
    (zone) => zone.zone_id
  );
  const suggestedAssets = dedupeByKey(
    sections.flatMap((section) => buildSectionAssets(section, zones)),
    (asset) => `${asset.zone_id}::${normalizeName(asset.name)}`
  );
  const matchedAssets = matchSuggestedAssets(existingAssets, suggestedAssets);
  const assetMap = materializeAssets(existingAssets, matchedAssets, suggestedAssets);
  const connectivity = inferConnectivity(zones, assetMap);

  return {
    zones,
    suggestedAssets: suggestedAssets.filter(
      (asset) => !matchedAssets.some((match) => match.suggested_name === asset.name && match.zone_id === asset.zone_id)
    ),
    matchedAssets,
    connectivity,
    summary: {
      zone_count: zones.length,
      matched_asset_count: matchedAssets.length,
      suggested_asset_count: suggestedAssets.length,
      conduit_count: connectivity.length,
    },
  };
}

function cleanLine(line) {
  return String(line || "")
    .replace(/\u2022/g, "-")
    .replace(/\s+/g, " ")
    .replace(/^[-*]\s*/, "- ")
    .trim();
}

function extractZoneSections(lines) {
  const sections = [];
  let current = null;
  let mode = "";

  for (const line of lines) {
    const heading = parseZoneHeading(line);
    if (heading) {
      if (current) sections.push(finalizeSection(current));
      current = { ...heading, description: "", relation_lines: [], items: [], vlan_rows: [] };
      mode = "";
      continue;
    }
    if (!current) continue;
    if (/^\d+(?:\.\d+)*\s+[A-Z]/.test(line) && !/zone/i.test(line)) {
      sections.push(finalizeSection(current));
      current = null;
      mode = "";
      continue;
    }
    if (/contains:?$/i.test(line)) {
      mode = "contains";
      continue;
    }
    if (/vlans?:$/i.test(line)) {
      mode = "vlan";
      continue;
    }
    if (!current.description && isNarrativeLine(line)) current.description = line;
    if (/via\b|firewall|switch|controller|server/i.test(line)) current.relation_lines.push(line);

    if (mode === "contains") {
      if (looksLikeBullet(line)) {
        current.items.push(stripBullet(line));
        continue;
      }
      if (current.items.length && isContinuation(line)) {
        current.items[current.items.length - 1] += ` ${line}`;
        continue;
      }
    }
    if (mode === "vlan") {
      const row = parseVlanRow(line);
      if (row) {
        current.vlan_rows.push(row);
        continue;
      }
    }
  }

  if (current) sections.push(finalizeSection(current));
  return sections.filter((section) => section.name);
}

function parseZoneHeading(line) {
  if (line.includes(" | ") || /contains:|vlans?:/i.test(line)) return null;
  const match = line.match(SECTION_RE);
  if (!match) return null;
  return {
    name: titleCase(match[1]),
    level: normalizeLevel(match[2] || inferLevel(match[1], "")),
  };
}

function finalizeSection(section) {
  section.description = cleanLine(section.description);
  section.items = section.items.map(cleanLine).filter(Boolean);
  section.relation_lines = dedupeByKey(section.relation_lines.map(cleanLine).filter(Boolean), (line) => line);
  section.vlan_rows = dedupeByKey(section.vlan_rows, (row) => row.vlan_name);
  return section;
}

function extractZoneTable(lines) {
  const zones = [];
  for (const line of lines) {
    if (!line.includes(" | ")) continue;
    const cols = line.split(/\s+\|\s+/).map((cell) => cleanLine(cell));
    if (cols.length < 2 || !/zone/i.test(cols[0])) continue;
    if (/^zone$/i.test(cols[0])) continue;
    const name = titleCase(cols[0]);
    zones.push({
      zone_id: `z_${slugify(name)}`,
      name,
      level: normalizeLevel(inferLevel(name, cols[1] || "")),
      description: cols[1] || "",
    });
  }
  return zones;
}

function sectionToZone(section) {
  if (!section?.name) return null;
  return {
    zone_id: `z_${slugify(section.name)}`,
    name: section.name,
    level: normalizeLevel(section.level || inferLevel(section.name, section.description)),
    description: cleanLine(section.description || ""),
  };
}

function buildSectionAssets(section, zones) {
  const zone = zones.find((item) => item.zone_id === `z_${slugify(section.name)}`) || sectionToZone(section);
  const rawDescriptors = [
    ...section.items,
    ...section.vlan_rows.flatMap((row) => expandVlanMembers(row.members)),
  ];
  return rawDescriptors
    .flatMap(expandDescriptor)
    .map((name) => makeAssetFromDescriptor(name, zone.zone_id))
    .filter(Boolean);
}

function parseVlanRow(line) {
  const cols = line.split(/\s+\|\s+/).map((cell) => cleanLine(cell));
  if (cols.length < 3) return null;
  const maybeIndex = cols[0].replace(/[^0-9]/g, "");
  if (!maybeIndex) return null;
  return {
    vlan_name: cols[1],
    members: cols.slice(2).join(", "),
  };
}

function expandVlanMembers(text) {
  return String(text || "")
    .split(/,(?![^(]*\))/)
    .map((part) => cleanLine(part))
    .filter(Boolean);
}

function expandDescriptor(text) {
  const cleaned = cleanDescriptor(text);
  if (!cleaned || IGNORE_DESCRIPTOR_RE.test(cleaned)) return [];
  if (/servers?\s+and\s+workstations?/i.test(cleaned)) {
    return [
      cleaned.replace(/servers?\s+and\s+workstations?/i, "Servers"),
      cleaned.replace(/servers?\s+and\s+workstations?/i, "Workstations"),
    ];
  }
  if (/\+\s*/.test(cleaned)) {
    return cleaned
      .split(/\s*\+\s*/)
      .map((part) => cleanDescriptor(part))
      .filter(Boolean);
  }
  return [cleaned];
}

function cleanDescriptor(text) {
  return cleanLine(String(text || "").replace(/\([^)]*\)/g, "").replace(/[.#]+/g, " "));
}

function makeAssetFromDescriptor(name, zone_id) {
  if (!name) return null;
  const asset_type = inferAssetType(name);
  const baseName = titleCase(name.replace(/\bVM\b/gi, "VM").replace(/\bNAS\b/gi, "NAS"));
  return {
    asset_id: `a_${slugify(baseName).slice(0, 40)}`,
    name: baseName,
    asset_type,
    vendor: "",
    model: "",
    firmware_version: "",
    ip_address: "",
    zone_id,
    criticality_score: asset_type === "plc" || asset_type === "safety-controller" ? 9 : 6,
    process_tag: "",
  };
}

function inferAssetType(name) {
  for (const hint of ASSET_TYPE_HINTS) {
    if (hint.re.test(name)) return hint.asset_type;
  }
  return "scada-server";
}

function inferLevel(name, description) {
  const text = `${name || ""} ${description || ""}`;
  const explicit = text.match(/\bL(\d(?:\.\d+)?)\b/i);
  if (explicit) return `L${explicit[1]}`;
  for (const hint of ZONE_LEVEL_HINTS) {
    if (hint.re.test(text)) return hint.level;
  }
  return "L2";
}

function normalizeLevel(level) {
  if (!level) return "L2";
  if (level === "L3.2") return "L3.5";
  return LEVEL_ORDER[level] != null ? level : "L2";
}

function matchSuggestedAssets(existingAssets, suggestedAssets) {
  const assets = (existingAssets || []).filter(hasSignal);
  const used = new Set();
  const matches = [];

  for (const suggested of suggestedAssets) {
    let best = null;
    let bestScore = 0;
    for (const existing of assets) {
      if (used.has(existing.asset_id)) continue;
      const score = assetMatchScore(existing, suggested);
      if (score > bestScore) {
        best = existing;
        bestScore = score;
      }
    }
    if (best && bestScore >= 6) {
      used.add(best.asset_id);
      matches.push({
        asset_id: best.asset_id,
        zone_id: suggested.zone_id,
        asset_type: best.asset_type || suggested.asset_type,
        suggested_name: suggested.name,
      });
    }
  }

  return matches;
}

function materializeAssets(existingAssets, matches, suggestedAssets) {
  const matchByAssetId = new Map(matches.map((match) => [match.asset_id, match]));
  const combined = [];

  for (const asset of existingAssets || []) {
    if (!hasSignal(asset)) continue;
    const match = matchByAssetId.get(asset.asset_id);
    combined.push(match ? { ...asset, zone_id: asset.zone_id || match.zone_id } : { ...asset });
  }

  for (const asset of suggestedAssets) {
    if (matches.some((match) => match.suggested_name === asset.name && match.zone_id === asset.zone_id)) continue;
    combined.push({ ...asset });
  }

  return combined;
}

function inferConnectivity(zones, assets) {
  const grouped = groupAssetsByZone(assets);
  const orderedZones = [...zones].sort((a, b) => levelValue(b.level) - levelValue(a.level));
  const conduits = [];

  for (let i = 0; i < orderedZones.length; i += 1) {
    const zone = orderedZones[i];
    const reps = pickRepresentatives(grouped.get(zone.zone_id) || []);
    if (reps.server && reps.hmi) addConduit(conduits, reps.server, reps.hmi, "opc-ua", 4840, "high", "bi");
    if (reps.hmi && reps.controller) addConduit(conduits, reps.hmi, reps.controller, "ethernet-ip", 44818, "high", "bi");
    if (reps.engineering && reps.controller) addConduit(conduits, reps.engineering, reps.controller, "ethernet-ip", 44818, "medium", "bi");

    const nextZone = orderedZones[i + 1];
    if (!nextZone) continue;
    const nextReps = pickRepresentatives(grouped.get(nextZone.zone_id) || []);

    if (zone.level === "L3.5" && reps.server && (nextReps.server || nextReps.hmi || nextReps.engineering)) {
      addConduit(conduits, reps.server, nextReps.server || nextReps.hmi || nextReps.engineering, "https", 443, "medium", "uni");
      continue;
    }
    if (reps.server && nextReps.hmi) addConduit(conduits, reps.server, nextReps.hmi, "opc-ua", 4840, "high", "bi");
    if ((reps.hmi || reps.engineering) && nextReps.controller) {
      addConduit(
        conduits,
        reps.hmi || reps.engineering,
        nextReps.controller,
        "ethernet-ip",
        44818,
        nextZone.level === "L1" || nextZone.level === "L0" ? "medium" : "high",
        "bi"
      );
    }
  }

  return conduits;
}

function groupAssetsByZone(assets) {
  const map = new Map();
  for (const asset of assets || []) {
    if (!asset.zone_id) continue;
    const bucket = map.get(asset.zone_id) || [];
    bucket.push(asset);
    map.set(asset.zone_id, bucket);
  }
  return map;
}

function pickRepresentatives(assets) {
  return {
    server: assets.find((asset) => ["scada-server", "historian"].includes(asset.asset_type)),
    hmi: assets.find((asset) => asset.asset_type === "hmi"),
    engineering: assets.find((asset) => asset.asset_type === "engineering-workstation"),
    controller: assets.find((asset) => ["plc", "safety-controller", "rtu"].includes(asset.asset_type)),
  };
}

function addConduit(list, source, target, protocol, port, trust_level, allowed_direction) {
  if (!source?.asset_id || !target?.asset_id || source.asset_id === target.asset_id) return;
  const key = `${source.asset_id}::${target.asset_id}::${protocol}::${port}`;
  if (list.some((item) => `${item.source_asset_id}::${item.target_asset_id}::${item.protocol}::${item.port}` === key)) return;
  list.push({
    source_asset_id: source.asset_id,
    target_asset_id: target.asset_id,
    protocol,
    port,
    trust_level,
    allowed_direction,
  });
}

function assetMatchScore(existing, suggested) {
  let score = 0;
  const existingName = normalizeName(existing.name);
  const suggestedName = normalizeName(suggested.name);
  if (!existingName) return score;
  if (existingName === suggestedName) score += 8;
  if (existingName.includes(suggestedName) || suggestedName.includes(existingName)) score += 6;
  const overlap = tokenOverlap(existingName, suggestedName);
  if (overlap >= 2) score += 4;
  if (existing.asset_type === suggested.asset_type) score += 2;
  return score;
}

function tokenOverlap(a, b) {
  const left = new Set(a.split(" ").filter(Boolean));
  const right = new Set(b.split(" ").filter(Boolean));
  let hits = 0;
  for (const token of left) if (right.has(token)) hits += 1;
  return hits;
}

function hasSignal(asset) {
  return !!(
    asset &&
    (cleanLine(asset.name).length || cleanLine(asset.vendor).length || cleanLine(asset.model).length || cleanLine(asset.ip_address).length)
  );
}

function isNarrativeLine(line) {
  return line.length > 24 && !looksLikeBullet(line) && !line.includes(" | ") && !/^page \d+/i.test(line);
}

function looksLikeBullet(line) {
  return /^-\s+/.test(line);
}

function stripBullet(line) {
  return line.replace(/^-\s+/, "").trim();
}

function isContinuation(line) {
  return !!line && !looksLikeBullet(line) && !line.includes(" | ") && !/contains:|vlans?:/i.test(line);
}

function slugify(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function normalizeName(text) {
  return cleanLine(text)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function titleCase(text) {
  return cleanLine(text).replace(/\b([a-z])/g, (m) => m.toUpperCase());
}

function dedupeByKey(items, getKey) {
  const out = [];
  const seen = new Set();
  for (const item of items || []) {
    const key = getKey(item);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

function levelValue(level) {
  return LEVEL_ORDER[level] ?? 2;
}
