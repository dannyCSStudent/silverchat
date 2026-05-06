"use client";

import type { Client, ClientActivity, ClientTag, ClientTagAssignment } from "@repo/types";
import { useMemo, useState } from "react";
import { useDashboardAction } from "./use-dashboard-action";

export function RecordManager({
  apiBaseUrl,
  clients,
  activity,
  tags,
  clientTags,
  isFallback,
}: {
  apiBaseUrl: string;
  clients: Client[];
  activity: ClientActivity[];
  tags: ClientTag[];
  clientTags: ClientTagAssignment[];
  isFallback: boolean;
}) {
  const { error, success, pendingKey, runAction } = useDashboardAction(apiBaseUrl);
  const [removedClientIds, setRemovedClientIds] = useState<string[]>([]);
  const [removedActivityIds, setRemovedActivityIds] = useState<string[]>([]);
  const [removedTagIds, setRemovedTagIds] = useState<string[]>([]);
  const [removedAssignmentKeys, setRemovedAssignmentKeys] = useState<string[]>([]);

  const visibleClients = useMemo(
    () => clients.filter((client) => !removedClientIds.includes(client.id)),
    [clients, removedClientIds],
  );
  const visibleActivity = useMemo(
    () => activity.filter((item) => !removedActivityIds.includes(item.id)),
    [activity, removedActivityIds],
  );
  const visibleTags = useMemo(
    () => tags.filter((tag) => !removedTagIds.includes(tag.id)),
    [tags, removedTagIds],
  );
  const visibleAssignments = useMemo(
    () =>
      clientTags.filter(
        (assignment) =>
          !removedAssignmentKeys.includes(`${assignment.client_id}:${assignment.tag_id}`),
      ),
    [clientTags, removedAssignmentKeys],
  );

  async function runDelete(
    key: string,
    path: string,
    successMessage: string,
    applyOptimistic: () => void,
    revertOptimistic: () => void,
  ) {
    applyOptimistic();
    const succeeded = await runAction({
      path,
      method: "DELETE",
      successMessage,
      defaultErrorMessage: "Delete failed.",
      pendingKey: key,
    });
    if (!succeeded) {
      revertOptimistic();
    }
  }

  return (
    <section className="rounded-[34px] border border-(--color-line) bg-(--color-surface) p-6 shadow-(--shadow-md) backdrop-blur">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-slate-500">
            Cleanup
          </p>
          <h3 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
            Manage records
          </h3>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            High-friction actions are separated here so destructive work stays deliberate.
          </p>
        </div>
        {isFallback ? (
          <p className="rounded-full bg-amber-100 px-4 py-2 text-sm font-medium text-amber-900">
            API offline: delete actions are disabled until the backend is running.
          </p>
        ) : null}
      </div>

      {error ? (
        <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {error}
        </div>
      ) : null}
      {success ? (
        <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {success}
        </div>
      ) : null}

      <div className="mt-6 grid gap-4 xl:grid-cols-2">
        <div className="rounded-[28px] border border-(--color-line) bg-white p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            Client records
          </p>
          <h4 className="mt-2 text-lg font-semibold text-slate-950">Clients</h4>
          <div className="mt-4 space-y-3">
            {visibleClients.slice(0, 5).map((client) => {
              const key = `client:${client.id}`;

              return (
                <div key={client.id} className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-slate-900">{client.name}</p>
                    <p className="text-xs text-slate-500">{client.status}</p>
                  </div>
                  <button
                    type="button"
                    disabled={Boolean(isFallback || pendingKey)}
                    onClick={() =>
                      runDelete(
                        key,
                        `/clients/${client.id}`,
                        "Client deleted.",
                        () => {
                          setRemovedClientIds((current) => [...current, client.id]);
                        },
                        () => {
                          setRemovedClientIds((current) =>
                            current.filter((id) => id !== client.id),
                          );
                        },
                      )
                    }
                    className="rounded-full border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-700 disabled:opacity-50"
                  >
                    {pendingKey === key ? "Deleting..." : "Delete"}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-[28px] border border-(--color-line) bg-white p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            Timeline records
          </p>
          <h4 className="mt-2 text-lg font-semibold text-slate-950">Activity</h4>
          <div className="mt-4 space-y-3">
            {visibleActivity.slice(0, 5).map((item) => {
              const clientName =
                clients.find((client) => client.id === item.client_id)?.name ?? "Unknown client";
              const key = `activity:${item.id}`;

              return (
                <div key={item.id} className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-slate-900">{clientName}</p>
                    <p className="text-xs text-slate-500">{item.interaction_type}</p>
                  </div>
                  <button
                    type="button"
                    disabled={Boolean(isFallback || pendingKey)}
                    onClick={() =>
                      runDelete(
                        key,
                        `/activity/${item.id}`,
                        "Activity deleted.",
                        () => {
                          setRemovedActivityIds((current) => [...current, item.id]);
                        },
                        () => {
                          setRemovedActivityIds((current) =>
                            current.filter((id) => id !== item.id),
                          );
                        },
                      )
                    }
                    className="rounded-full border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-700 disabled:opacity-50"
                  >
                    {pendingKey === key ? "Deleting..." : "Delete"}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-[28px] border border-(--color-line) bg-white p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            Taxonomy
          </p>
          <h4 className="mt-2 text-lg font-semibold text-slate-950">Tags</h4>
          <div className="mt-4 space-y-3">
            {visibleTags.slice(0, 5).map((tag) => {
              const key = `tag:${tag.id}`;

              return (
                <div key={tag.id} className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: tag.color }}
                    />
                    <p className="text-sm font-medium text-slate-900">{tag.name}</p>
                  </div>
                  <button
                    type="button"
                    disabled={Boolean(isFallback || pendingKey)}
                    onClick={() =>
                      runDelete(
                        key,
                        `/tags/${tag.id}`,
                        "Tag deleted.",
                        () => {
                          setRemovedTagIds((current) => [...current, tag.id]);
                        },
                        () => {
                          setRemovedTagIds((current) =>
                            current.filter((id) => id !== tag.id),
                          );
                        },
                      )
                    }
                    className="rounded-full border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-700 disabled:opacity-50"
                  >
                    {pendingKey === key ? "Deleting..." : "Delete"}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-[28px] border border-(--color-line) bg-white p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            Relationships
          </p>
          <h4 className="mt-2 text-lg font-semibold text-slate-950">Assignments</h4>
          <div className="mt-4 space-y-3">
            {visibleAssignments.slice(0, 5).map((assignment) => {
              const key = `assignment:${assignment.client_id}:${assignment.tag_id}`;
              const assignmentKey = `${assignment.client_id}:${assignment.tag_id}`;
              const clientName =
                clients.find((client) => client.id === assignment.client_id)?.name ?? "Unknown client";
              const tagName =
                tags.find((tag) => tag.id === assignment.tag_id)?.name ?? "Unknown tag";

              return (
                <div key={key} className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-slate-900">{clientName}</p>
                    <p className="text-xs text-slate-500">{tagName}</p>
                  </div>
                  <button
                    type="button"
                    disabled={Boolean(isFallback || pendingKey)}
                    onClick={() =>
                      runDelete(
                        key,
                        `/client-tags/?client_id=${encodeURIComponent(assignment.client_id)}&tag_id=${encodeURIComponent(assignment.tag_id)}`,
                        "Tag assignment removed.",
                        () => {
                          setRemovedAssignmentKeys((current) => [...current, assignmentKey]);
                        },
                        () => {
                          setRemovedAssignmentKeys((current) =>
                            current.filter((candidate) => candidate !== assignmentKey),
                          );
                        },
                      )
                    }
                    className="rounded-full border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-700 disabled:opacity-50"
                  >
                    {pendingKey === key ? "Deleting..." : "Delete"}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
