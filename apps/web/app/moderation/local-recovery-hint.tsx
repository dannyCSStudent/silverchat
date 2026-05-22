"use client";

import Link from "next/link";

import { getHighestAttentionRoute } from "./admin-health-status-strip";

type HighestAttentionRoute = NonNullable<
  ReturnType<typeof getHighestAttentionRoute>
>;

type LocalRecoveryHintProps = {
  className?: string;
  endpointClassName?: string;
  prefix?: string;
  route: HighestAttentionRoute;
};

export function LocalRecoveryHint({
  className,
  endpointClassName,
  prefix = "Check next:",
  route,
}: LocalRecoveryHintProps) {
  const message = prefix
    ? `${prefix} ${route.label} · ${route.hint}`
    : `${route.hint}`;

  return (
    <div className={className}>
      <span>{message}</span>
      <Link
        href={route.endpointHref}
        target="_blank"
        rel="noreferrer"
        className={endpointClassName}
      >
        Open endpoint
      </Link>
    </div>
  );
}
