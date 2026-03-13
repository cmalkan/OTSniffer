import Link from "next/link";

export default function HomePage() {
  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <h1 className="text-4xl font-bold">OT Blast Radius Simulator</h1>
      <p className="mt-3 max-w-3xl text-malkan-muted">
        Deployable Netlify MVP for OT-only post-DMZ cyber impact simulation in energy and manufacturing plants.
      </p>

      <div className="mt-8 grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-cyan-900/60 bg-malkan-panel p-4">
          <h2 className="text-lg font-semibold">Domain Models</h2>
          <p className="mt-2 text-sm text-malkan-muted">Asset, Zone, Vulnerability, Connectivity, Process Function, Simulation Result.</p>
        </div>
        <div className="rounded-xl border border-cyan-900/60 bg-malkan-panel p-4">
          <h2 className="text-lg font-semibold">API Surface</h2>
          <p className="mt-2 text-sm text-malkan-muted">/api/assets, /api/assets/[assetId], /api/graph/summary, /api/demo-scenarios.</p>
        </div>
        <div className="rounded-xl border border-cyan-900/60 bg-malkan-panel p-4">
          <h2 className="text-lg font-semibold">Demo Ready</h2>
          <p className="mt-2 text-sm text-malkan-muted">Single repo, no DB, JSON fixtures, Netlify Functions-compatible routes.</p>
        </div>
      </div>

      <Link href="/dashboard" className="mt-8 inline-block rounded-lg bg-malkan-accent px-5 py-3 font-semibold text-slate-950">
        Open Dashboard Shell
      </Link>
    </main>
  );
}
