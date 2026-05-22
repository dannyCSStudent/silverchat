"use client";

import Link from "next/link";

export type RecoveryHintRoute = {
  detail?: string;
  endpointHref: string;
  hint: string;
  label: string;
  path: string;
  status?: unknown;
};

type LocalRecoveryHintProps = {
  className?: string;
  endpointClassName?: string;
  pathClassName?: string;
  prefix?: string;
  route: RecoveryHintRoute;
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
