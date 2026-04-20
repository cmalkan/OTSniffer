import { validateFinding, findingToVulnerability } from "./schema.mjs";

const MAX_REJECTION_SAMPLES = 20;

export function mergeFindings(plant, findings, { now = () => new Date().toISOString() } = {}) {
  const assetIds = new Set((plant.assets || []).map((a) => a.asset_id));
  const existingVulnIds = new Set((plant.vulnerabilities || []).map((v) => v.vuln_id));
  const existingEvidenceIds = new Set((plant.evidence_findings || []).map((f) => f.finding_id));

  const accepted = [];
  const rejected = [];
  for (const f of findings) {
    const errors = validateFinding(f);
    if (errors.length) { rejected.push({ finding: f, errors }); continue; }
    if (!assetIds.has(f.asset_id)) {
      rejected.push({ finding: f, errors: [`unknown asset_id ${f.asset_id}`] });
      continue;
    }
    accepted.push(f);
  }

  const newVulns = accepted
    .filter((f) => !existingVulnIds.has(f.finding_id))
    .map(findingToVulnerability);
  const newEvidence = accepted.filter((f) => !existingEvidenceIds.has(f.finding_id));

  return {
    ...plant,
    vulnerabilities: [...(plant.vulnerabilities || []), ...newVulns],
    evidence_findings: [...(plant.evidence_findings || []), ...newEvidence],
    evidence_meta: {
      merged_at: now(),
      accepted_count: accepted.length,
      rejected_count: rejected.length,
      rejections: rejected.slice(0, MAX_REJECTION_SAMPLES),
      rejections_truncated: rejected.length > MAX_REJECTION_SAMPLES,
    },
  };
}
