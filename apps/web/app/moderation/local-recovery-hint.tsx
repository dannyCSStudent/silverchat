"use client";

import Link from "next/link";

import { getHighestAttentionRoute } from "./admin-health-status-strip";

type HighestAttentionRoute = NonNullable<
  ReturnType<typeof getHighestAttentionRoute>
>;

type LocalRecoveryHintProps = {
  className?: string;
  endpointClassName?: string;
  pathClassName?: string;
  prefix?: string;
  route: HighestAttentionRoute;
  showPath?: boolean;
};

export function LocalRecoveryHint({
  className,
  endpointClassName,
  pathClassName,
  prefix = "Check next:",
  route,
  showPath = false,
}: LocalRecoveryHintProps) {
  const message = prefix
    ? `${prefix} ${route.label} · ${route.hint}`
    : `${route.hint}`;

  return (
    <div className={className}>
      {showPath ? (
        <p className={pathClassName}>
          {route.label} · {route.path}
        </p>
      ) : null}
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
