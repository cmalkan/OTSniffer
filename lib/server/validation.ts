import { PlantData } from "@/lib/models/domain";

export function validatePlantData(data: unknown): asserts data is PlantData {
  if (!data || typeof data !== "object") throw new Error("Plant data must be an object");
  const d = data as Partial<PlantData>;
  if (!d.assets || !Array.isArray(d.assets)) throw new Error("Missing assets[]");
  if (!d.zones || !Array.isArray(d.zones)) throw new Error("Missing zones[]");
  if (!d.vulnerabilities || !Array.isArray(d.vulnerabilities)) throw new Error("Missing vulnerabilities[]");
  if (!d.connectivity || !Array.isArray(d.connectivity)) throw new Error("Missing connectivity[]");
  if (!d.process_functions || !Array.isArray(d.process_functions)) throw new Error("Missing process_functions[]");
  if (!d.demo_scenarios || !Array.isArray(d.demo_scenarios)) throw new Error("Missing demo_scenarios[]");
}
