export function LoadingState({ label = '載入中…' }: { label?: string }) {
  return (
    <div role="status" aria-live="polite" className="grid gap-3">
      <span className="sr-only">{label}</span>
      <div className="h-8 w-2/3 max-w-sm animate-pulse rounded-lg bg-border-gray" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2].map((key) => (
          <div key={key} className="h-28 animate-pulse rounded-card bg-surface" />
        ))}
      </div>
      <div className="h-48 animate-pulse rounded-card bg-surface" />
    </div>
  );
}
