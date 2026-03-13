import { Connectivity, ProcessFunction } from "@/lib/models/domain";

export interface BlastRadiusInput {
  compromisedAssetId: string;
  connectivity: Connectivity[];
  processFunctions: ProcessFunction[];
}

export interface BlastRadiusOutput {
  impactedAssetIds: string[];
  impactedProcessIds: string[];
}

/**
 * Month-1 scaffolding: simple directed reachability from compromised node.
 * Month-2 will add zone traversal policies, protocol weighting, and kill-chain probabilities.
 */
export function simulateBlastRadius(input: BlastRadiusInput): BlastRadiusOutput {
  const adjacency = new Map<string, string[]>();
  for (const edge of input.connectivity) {
    const next = adjacency.get(edge.source_asset_id) ?? [];
    next.push(edge.target_asset_id);
    adjacency.set(edge.source_asset_id, next);
    if (edge.allowed_direction === "bi") {
      const rev = adjacency.get(edge.target_asset_id) ?? [];
      rev.push(edge.source_asset_id);
      adjacency.set(edge.target_asset_id, rev);
    }
  }

  const visited = new Set<string>([input.compromisedAssetId]);
  const queue = [input.compromisedAssetId];

  while (queue.length) {
    const current = queue.shift()!;
    for (const n of adjacency.get(current) ?? []) {
      if (!visited.has(n)) {
        visited.add(n);
        queue.push(n);
      }
    }
  }

  const impactedAssetIds = Array.from(visited);
  const impactedProcessIds = input.processFunctions
    .filter((pf) => pf.dependent_asset_ids.some((id) => visited.has(id)))
    .map((pf) => pf.process_id);

  return { impactedAssetIds, impactedProcessIds };
}
