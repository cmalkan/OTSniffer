// vendor-bank.mjs — canonical OT/ICS vendor and product registry.
//
// Single source of truth for vendor-name canonicalization. Imported by:
//   - scripts/onboarding/vendor-recognize.mjs   (PDF extraction node-side)
//   - web/js/vendor-recognize.js                (browser mirror — keep in sync)
//   - scripts/otsniff/scanners/advisories.mjs   (SBOM → CISA advisory matcher)
//
// When you encounter an unrecognized vendor, ADD A ROW HERE — do NOT
// inline a regex into the parser or the matcher. Drift between extractor
// and matcher is the #1 cause of false negatives.
//
// Each vendor entry:
//   canonical      — name we publish to feeds, dashboards, reports
//   aliases        — array of regexes that match raw text mentioning this vendor
//   feed_aliases   — additional names this vendor is known by in CISA/NVD feeds
//                    (used only by the SBOM matcher, not the extractor)
//   products[]     — known product families with their own markers; markers
//                    that match raw text imply this product (and therefore
//                    this vendor, if no vendor was found)

export const VENDOR_BANK = [
  {
    canonical: "Rockwell Automation",
    aliases: [
      /\brockwell(?:\s+automation)?\b/i,
      /\ballen[\s-]?bradley\b/i,
      /\bA[\s-]?B\s+PLC\b/i,
      /\(\s*AB\s+PLC\s*\)/i,
    ],
    feed_aliases: ["Rockwell Automation", "Allen-Bradley"],
    products: [
      { canonical: "ControlLogix",  marker: /\bcontrol[\s-]?logix\b/i },
      { canonical: "GuardLogix",    marker: /\bguard[\s-]?logix\b/i },
      { canonical: "MicroLogix",    marker: /\bmicro[\s-]?logix\b/i },
      { canonical: "CompactLogix",  marker: /\bcompact[\s-]?logix\b/i },
      { canonical: "FactoryTalk",   marker: /\bfactory[\s-]?talk\b/i },
      { canonical: "Studio 5000",   marker: /\bstudio\s*5000\b/i },
      { canonical: "Stratix",       marker: /\bstratix\b/i },
      { canonical: "ArmorStart",    marker: /\barmor[\s-]?start\b/i },
      { canonical: "PanelView",     marker: /\bpanel[\s-]?view\b/i },
      { canonical: "1756",          marker: /\b1756[\s-]?[A-Z0-9]+/i }, // ControlLogix module catalog
    ],
  },

  {
    canonical: "Schneider Electric",
    aliases: [
      /\bschneider(?:\s+electric)?\b/i,
      /\bSE\s+Project\s+No\b/i,
    ],
    feed_aliases: ["Schneider Electric"],
    products: [
      { canonical: "ConneXium",  marker: /\bconne[xX]ium\b/i },
      { canonical: "Modicon",    marker: /\bmodicon\b/i },
      { canonical: "M580",       marker: /\bM5[0-9]{2}\b/ },
      { canonical: "M340",       marker: /\bM3[0-9]{2}\b/ },
      { canonical: "Premium",    marker: /\bpremium\s+plc\b/i },
      { canonical: "Quantum",    marker: /\bquantum\s+plc\b/i },
      { canonical: "Tofino",     marker: /\btofino\b/i },
    ],
  },

  // Foxboro is a Schneider product line but has its own advisory namespace
  {
    canonical: "Schneider Electric (Foxboro)",
    aliases: [
      /\bfoxboro(?:\s+evo)?\b/i,
      /\bInvensys\b/i,
    ],
    feed_aliases: ["Foxboro", "Invensys", "Schneider Electric"],
    products: [
      { canonical: "FCP270",  marker: /\bFCP[\s-]?270\b/i },
      { canonical: "FCP280",  marker: /\bFCP[\s-]?280\b/i },
      { canonical: "FDC280",  marker: /\bFDC[\s-]?280\b/i },
      { canonical: "FBM233",  marker: /\bFBM[\s-]?233\b/i },
      { canonical: "FBM",     marker: /\bFBM\d{2,3}\b/i },
      { canonical: "Foxboro Evo", marker: /\bfoxboro\s+evo\b/i },
      { canonical: "I/A Series", marker: /\bI\/?A\s+Series\b/i },
    ],
  },

  // Triconex / Trident — Schneider SIS family, distinct CVE namespace
  {
    canonical: "Schneider Electric (Triconex)",
    aliases: [
      /\btriconex\b/i,
      /\btrident\b/i,
      /\btricon\b/i,
      /\bTSAA\b/, // protocol marker
    ],
    feed_aliases: ["Schneider Electric", "Triconex"],
    products: [
      { canonical: "Tricon",    marker: /\btricon\b/i },
      { canonical: "Trident",   marker: /\btrident\b/i },
      { canonical: "TriStation", marker: /\btri[\s-]?station\b/i },
    ],
  },

  {
    canonical: "Siemens",
    aliases: [/\bsiemens\b/i],
    feed_aliases: ["Siemens"],
    products: [
      { canonical: "SIMATIC S7-1500", marker: /\bS7[\s-]?1500\b/i },
      { canonical: "SIMATIC S7-1200", marker: /\bS7[\s-]?1200\b/i },
      { canonical: "SIMATIC S7-300",  marker: /\bS7[\s-]?300\b/i },
      { canonical: "SIMATIC S7-400",  marker: /\bS7[\s-]?400\b/i },
      { canonical: "SIMATIC",         marker: /\bSIMATIC\b/ },
      { canonical: "WinCC",           marker: /\bwin\s?cc\b/i },
      { canonical: "TIA Portal",      marker: /\btia\s+portal\b/i },
      { canonical: "RUGGEDCOM",       marker: /\bruggedcom\b/i },
      { canonical: "SCALANCE",        marker: /\bscalance\b/i },
    ],
  },

  {
    canonical: "Honeywell",
    aliases: [/\bhoneywell\b/i],
    feed_aliases: ["Honeywell"],
    products: [
      { canonical: "Experion PKS",  marker: /\bexperion(?:\s+pks)?\b/i },
      { canonical: "C300",          marker: /\bC[\s-]?300\b/ },
      { canonical: "ControlEdge",   marker: /\bcontrol[\s-]?edge\b/i },
      { canonical: "Safety Manager", marker: /\bsafety\s+manager\b/i },
      { canonical: "FSC",           marker: /\bFSC\b\s+(?:safety|controller)/i },
      { canonical: "HC900",         marker: /\bHC[\s-]?900\b/ },
      { canonical: "Halon FDS",     marker: /\bhalon\s+FDS\b/i },
      { canonical: "Dynamo",        marker: /\bdynamo\s+(?:server|collector)\b/i },
    ],
  },

  {
    canonical: "Emerson",
    aliases: [/\bemerson\b/i],
    feed_aliases: ["Emerson"],
    products: [
      { canonical: "DeltaV",       marker: /\bdelta[\s-]?v\b/i },
      { canonical: "Ovation",      marker: /\bovation\b/i },
      { canonical: "AMS Suite",    marker: /\bAMS\s+Suite\b/i },
      { canonical: "ROC800",       marker: /\bROC[\s-]?800\b/ },
      { canonical: "FloBoss",      marker: /\bfloboss\b/i },
    ],
  },

  {
    canonical: "Yokogawa",
    aliases: [/\byokogawa\b/i],
    feed_aliases: ["Yokogawa"],
    products: [
      { canonical: "CENTUM CS3000",  marker: /\bcentum\s+cs[\s-]?3000\b/i },
      { canonical: "CENTUM VP",      marker: /\bcentum\s+vp\b/i },
      { canonical: "CENTUM",         marker: /\bcentum\b/i },
      { canonical: "ProSafe-RS",     marker: /\bprosafe(?:-rs)?\b/i },
      { canonical: "Stardom",        marker: /\bstardom\b/i },
    ],
  },

  {
    canonical: "ABB",
    aliases: [/\bABB\b/, /\babb\s+ltd\b/i],
    feed_aliases: ["ABB"],
    products: [
      { canonical: "800xA",   marker: /\b800x[aA]\b/ },
      { canonical: "AC500",   marker: /\bAC[\s-]?500\b/ },
      { canonical: "AC800M",  marker: /\bAC[\s-]?800M\b/ },
      { canonical: "Symphony Plus", marker: /\bsymphony\s+plus\b/i },
    ],
  },

  {
    canonical: "Mitsubishi Electric",
    aliases: [/\bmitsubishi(?:\s+electric)?\b/i],
    feed_aliases: ["Mitsubishi Electric"],
    products: [
      { canonical: "MELSEC",      marker: /\bmelsec\b/i },
      { canonical: "FX Series",   marker: /\bFX\s+Series\b/i },
      { canonical: "GX Works",    marker: /\bGX\s+Works\b/i },
    ],
  },

  {
    canonical: "Omron",
    aliases: [/\bomron\b/i],
    feed_aliases: ["Omron"],
    products: [
      { canonical: "CJ Series",     marker: /\bCJ\s+Series\b/i },
      { canonical: "NJ Controller", marker: /\bNJ[\s-]?\d+/i },
      { canonical: "Sysmac",        marker: /\bsysmac\b/i },
    ],
  },

  {
    canonical: "AspenTech",
    aliases: [
      /\baspen(?:tech)?\b/i,
      /\baspen\s+technology\b/i,
    ],
    feed_aliases: ["AspenTech"],
    products: [
      { canonical: "InfoPlus.21", marker: /\bIP[\s-]?21\b/ },
      { canonical: "DMC3",        marker: /\bDMC[\s-]?[3]\b/ },
      { canonical: "Aspen DMC",   marker: /\baspen\s+DMC\b/i },
      { canonical: "DMC Server",  marker: /\bDMC\s+(?:Server|Gateway)\b/i },
    ],
  },

  {
    canonical: "AVEVA",
    aliases: [/\baveva\b/i, /\bwonderware\b/i, /\bOSIsoft\b/i, /\bPI\s+System\b/i],
    feed_aliases: ["AVEVA", "OSIsoft", "Wonderware"],
    products: [
      { canonical: "System Platform", marker: /\bsystem\s+platform\b/i },
      { canonical: "Historian",       marker: /\b(?:aveva\s+)?historian\b/i },
      { canonical: "InTouch",         marker: /\bintouch\b/i },
      { canonical: "OASyS",           marker: /\boasys\b/i },
      { canonical: "PI Server",       marker: /\bPI\s+(?:Server|System)\b/i },
    ],
  },

  {
    canonical: "Bently Nevada (Baker Hughes)",
    aliases: [/\bbently\s+nevada\b/i, /\bbaker\s+hughes\b/i],
    feed_aliases: ["Bently Nevada", "Baker Hughes"],
    products: [
      { canonical: "3500 Series", marker: /\b3500\s+(?:series|rack)\b/i },
      { canonical: "System 1",    marker: /\bsystem\s+1\b/i },
      { canonical: "Orbit",       marker: /\borbit\b/i },
      { canonical: "RANGER PRO",  marker: /\branger\s+pro\b/i },
      { canonical: "MMS",         marker: /\bMMS\b\s+\(Bently/i }, // machinery monitoring
    ],
  },

  {
    canonical: "Trellix (formerly McAfee)",
    aliases: [/\btrellix\b/i, /\bmcafee\b/i],
    feed_aliases: ["Trellix", "McAfee"],
    products: [
      { canonical: "ePolicy Orchestrator", marker: /\b(?:ePO|ePolicy\s+Orchestrator)\b/i },
    ],
  },

  {
    canonical: "Nozomi Networks",
    aliases: [/\bnozomi(?:\s+networks)?\b/i],
    feed_aliases: ["Nozomi Networks"],
    products: [
      { canonical: "Guardian", marker: /\bnozomi.*?(?:guardian|IDS)\b/i },
      { canonical: "Vantage",  marker: /\bnozomi.*?vantage\b/i },
    ],
  },

  {
    canonical: "Claroty",
    aliases: [/\bclaroty\b/i],
    feed_aliases: ["Claroty"],
    products: [
      { canonical: "CTD", marker: /\bclaroty\s+(?:CTD|continuous)/i },
      { canonical: "xDome", marker: /\bxdome\b/i },
    ],
  },

  {
    canonical: "Dragos",
    aliases: [/\bdragos\b/i],
    feed_aliases: ["Dragos"],
    products: [
      { canonical: "Platform", marker: /\bdragos\s+platform\b/i },
    ],
  },

  {
    canonical: "Fortinet",
    aliases: [/\bfortinet\b/i, /\bfortigate\b/i],
    feed_aliases: ["Fortinet"],
    products: [
      { canonical: "FortiGate",    marker: /\bfortigate\b/i },
      { canonical: "FortiSwitch",  marker: /\bfortiswitch\b/i },
      { canonical: "FortiAnalyzer", marker: /\bfortianalyzer\b/i },
      { canonical: "FortiManager", marker: /\bfortimanager\b/i },
    ],
  },

  {
    canonical: "Cisco",
    aliases: [/\bcisco\b/i],
    feed_aliases: ["Cisco"],
    products: [
      { canonical: "Catalyst",   marker: /\bcatalyst\s+\d+/i },
      { canonical: "ASA",        marker: /\bASA\s+\d{4}/i },
      { canonical: "Firepower",  marker: /\bfirepower\b/i },
      { canonical: "IE-Series",  marker: /\bIE[\s-]?\d{4}\b/ },
      { canonical: "Cyber Vision", marker: /\bcyber\s+vision\b/i },
    ],
  },

  {
    canonical: "Belden / Hirschmann",
    aliases: [/\bhirschmann\b/i, /\bbelden\b/i],
    feed_aliases: ["Belden", "Hirschmann"],
    products: [
      { canonical: "Tofino",  marker: /\btofino\b/i }, // also under Schneider
      { canonical: "RS Series", marker: /\bRS\d+\s+industrial\b/i },
    ],
  },

  {
    canonical: "Moxa",
    aliases: [/\bmoxa\b/i],
    feed_aliases: ["Moxa"],
    products: [
      { canonical: "EDS Series", marker: /\bEDS[\s-]?\d+/i },
      { canonical: "NPort",      marker: /\bnport\b/i },
    ],
  },

  {
    canonical: "Phoenix Contact",
    aliases: [/\bphoenix\s+contact\b/i],
    feed_aliases: ["Phoenix Contact"],
    products: [
      { canonical: "FL Switch", marker: /\bFL\s+Switch\b/i },
      { canonical: "PLCnext",   marker: /\bplcnext\b/i },
    ],
  },

  {
    canonical: "Wago",
    aliases: [/\bwago\b/i],
    feed_aliases: ["Wago"],
    products: [
      { canonical: "PFC100",  marker: /\bPFC[\s-]?100\b/ },
      { canonical: "PFC200",  marker: /\bPFC[\s-]?200\b/ },
    ],
  },

  {
    canonical: "B&R Industrial Automation",
    aliases: [/\bB&R\b/, /\bbernecker\b/i],
    feed_aliases: ["B&R Industrial Automation"],
    products: [
      { canonical: "X20", marker: /\bX20\b/ },
    ],
  },
];

// Pre-compute a lookup of feed_alias -> Set<canonical>. A single feed alias
// (e.g. "Schneider Electric") may legitimately map to several canonical
// buckets in our taxonomy (Schneider Electric, Foxboro, Triconex) because
// public feeds lump sub-brands under the parent — we want the advisory to
// surface against assets in ANY of those buckets.
export function buildFeedAliasIndex() {
  const idx = new Map();
  const add = (alias, canonical) => {
    const k = String(alias || "").toLowerCase();
    if (!k) return;
    const set = idx.get(k) || new Set();
    set.add(canonical);
    idx.set(k, set);
  };
  for (const v of VENDOR_BANK) {
    add(v.canonical, v.canonical);
    for (const alias of v.feed_aliases || []) add(alias, v.canonical);
  }
  return idx;
}

// Recognize vendor + product family from a piece of raw text. Returns the
// best match, or null. `text` may be a full PDF line, a line group, or a
// single asset name. Caller decides scope.
//
// Returns: { vendor_canonical, product_canonical?, evidence, confidence }
//   confidence: 0.9 = vendor + product hit, 0.7 = vendor only,
//               0.6 = product hit (vendor inferred from product), 0.0 = no match
export function recognizeVendor(text) {
  if (!text || typeof text !== "string") return null;
  const sample = text.slice(0, 600); // bound work

  let bestVendor = null;
  let bestProduct = null;
  let evidence = "";

  // Pass 1: vendor matches
  for (const v of VENDOR_BANK) {
    for (const re of v.aliases) {
      const m = sample.match(re);
      if (m) {
        bestVendor = v;
        evidence = m[0];
        break;
      }
    }
    if (bestVendor === v) break;
  }

  // Pass 2: product matches (may set vendor too if pass 1 missed)
  for (const v of VENDOR_BANK) {
    for (const p of v.products || []) {
      const m = sample.match(p.marker);
      if (m) {
        // Only adopt this product if it's consistent with vendor (or vendor is
        // unset). Avoid e.g. a "Tofino" hit pulling Belden when Schneider was
        // already detected.
        if (!bestVendor) {
          bestVendor = v;
          bestProduct = p;
          evidence = m[0];
        } else if (bestVendor === v && !bestProduct) {
          bestProduct = p;
          evidence = `${evidence}; ${m[0]}`;
        }
      }
    }
  }

  if (!bestVendor) return null;

  return {
    vendor_canonical: bestVendor.canonical,
    product_canonical: bestProduct ? bestProduct.canonical : null,
    evidence,
    confidence: bestProduct ? 0.9 : 0.7,
  };
}
