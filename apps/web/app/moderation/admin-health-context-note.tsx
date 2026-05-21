"use client";

import { useLiveAdminHealth } from "./use-live-admin-health";

const VERY_SLOW_ROUTE_THRESHOLD_MS = 2000;
const SLOW_ROUTE_THRESHOLD_MS = 750;

type AdminHealthContextNoteProps = {
  degradedDetail: string;
  healthyDetail?: string;
  slowDetail: string;
  verySlowDetail: string;
};

function getNoteState(
  statuses: ReturnType<typeof useLiveAdminHealth>["currentHealth"]["statuses"],
  props: AdminHealthContextNoteProps,
) {
  if (statuses.some((status) => !status.ok)) {
    return {
      classes: "border-rose-200 bg-rose-50 text-rose-900",
      detail: props.degradedDetail,
      title: "Context: degraded admin path",
    };
  }

  if (statuses.some((status) => (status.durationMs ?? 0) >= VERY_SLOW_ROUTE_THRESHOLD_MS)) {
    return {
      classes: "border-amber-200 bg-amber-50 text-amber-900",
      detail: props.verySlowDetail,
      title: "Context: very slow admin path",
    };
  }

  if (statuses.some((status) => (status.durationMs ?? 0) >= SLOW_ROUTE_THRESHOLD_MS)) {
    return {
      classes: "border-amber-200 bg-amber-50 text-amber-900",
      detail: props.slowDetail,
      title: "Context: slow admin path",
    };
  }

  if (!props.healthyDetail) {
    return null;
  }

  return {
    classes: "border-emerald-200 bg-emerald-50 text-emerald-900",
    detail: props.healthyDetail,
    title: "Context: healthy admin path",
  };
}

export function AdminHealthContextNote(props: AdminHealthContextNoteProps) {
  const { currentHealth } = useLiveAdminHealth();
  const noteState = getNoteState(currentHealth.statuses, props);

  if (!noteState) {
    return null;
  }

  return (
    <div className={`mt-4 rounded-2xl border px-4 py-3 text-sm ${noteState.classes}`}>
      <p className="font-semibold">{noteState.title}</p>
      <p className="mt-1">{noteState.detail}</p>
    </div>
  );
}
