type DataSourceBadgeProps = {
  isFallback: boolean;
};

export function DataSourceBadge({ isFallback }: DataSourceBadgeProps) {
  return (
    <div
      className={`rounded-full px-4 py-2 text-sm font-medium ${
        isFallback ? "bg-amber-100 text-amber-900" : "bg-emerald-100 text-emerald-900"
      }`}
    >
      {isFallback ? "Fallback dataset" : "Live API connected"}
    </div>
  );
}
