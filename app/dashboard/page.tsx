import { StatCard } from "@/components/StatCard";
import { getGraphSummary } from "@/lib/server/repository";

export const dynamic = "force-static";

export default function DashboardPage() {
  const summary = getGraphSummary();

  return (
    <main className="mx-auto max-w-7xl px-6 py-8">
      <h1 className="text-3xl font-bold">OT Risk Dashboard (MVP Shell)</h1>
      <p className="mt-2 text-malkan-muted">Month 1: Netlify foundation + domain APIs + data ingestion-ready architecture.</p>

      <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard label="OT Assets" value={summary.asset_count} />
        <StatCard label="Zones" value={summary.zone_count} />
        <StatCard label="Connectivity Edges" value={summary.connectivity_count} />
        <StatCard label="Vulnerabilities" value={summary.vulnerability_count} />
        <StatCard label="Critical Functions" value={summary.process_function_count} />
      </section>

      <section className="mt-8 rounded-xl border border-cyan-900/60 bg-malkan-panel p-5">
        <h2 className="text-xl font-semibold">Blast Radius Engine Placeholder</h2>
        <p className="mt-2 text-sm text-malkan-muted">
          Next month this panel will run “If asset X is compromised, what zones/assets/process functions are impacted?”
        </p>
      </section>
    </main>
  );
}
