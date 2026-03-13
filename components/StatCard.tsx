export function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-cyan-900/60 bg-malkan-panel p-4">
      <div className="text-xs uppercase tracking-wide text-malkan-muted">{label}</div>
      <div className="mt-2 text-2xl font-semibold text-malkan-accent">{value}</div>
    </div>
  );
}
