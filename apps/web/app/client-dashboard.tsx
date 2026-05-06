"use client";

import type { Client, ClientActivity, ClientTag } from "@repo/types";
import Link from "next/link";
import { useDeferredValue, useMemo, useState } from "react";
import { ClientCard } from "@repo/ui";
import { useDashboardAction } from "./use-dashboard-action";

type ClientDashboardProps = {
  clients: Client[];
  tags: ClientTag[];
  apiBaseUrl: string;
  isFallback: boolean;
};

type StatusFilter = "all" | Client["status"];

const statusOptions: StatusFilter[] = ["all", "lead", "active", "completed"];
const interactionOptions: ClientActivity["interaction_type"][] = [
  "call",
  "email",
  "meeting",
  "note",
  "follow_up",
];

export function ClientDashboard({
  clients,
  tags,
  apiBaseUrl,
  isFallback,
}: ClientDashboardProps) {
  const { error, success, pendingKey, runAction } = useDashboardAction(apiBaseUrl);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [draftStatuses, setDraftStatuses] = useState<Record<string, Client["status"]>>({});
  const [draftTagIds, setDraftTagIds] = useState<Record<string, string>>({});
  const [draftActivityTypes, setDraftActivityTypes] = useState<
    Record<string, ClientActivity["interaction_type"]>
  >({});
  const [draftActivityNotes, setDraftActivityNotes] = useState<Record<string, string>>({});
  const [draftEmails, setDraftEmails] = useState<Record<string, string>>({});
  const [draftPhones, setDraftPhones] = useState<Record<string, string>>({});
  const [draftLastContactedAt, setDraftLastContactedAt] = useState<Record<string, string>>({});
  const [optimisticStatuses, setOptimisticStatuses] = useState<Record<string, Client["status"]>>(
    {},
  );
  const [optimisticContacts, setOptimisticContacts] = useState<
    Record<
      string,
      {
        email?: string | null;
        phone?: string | null;
        last_contacted_at?: string | null;
      }
    >
  >({});
  const [optimisticTagAdds, setOptimisticTagAdds] = useState<Record<string, ClientTag[]>>({});
  const [optimisticTagRemovals, setOptimisticTagRemovals] = useState<Record<string, string[]>>(
    {},
  );
  const deferredQuery = useDeferredValue(query);

  function toLocalDatetimeValue(value?: string) {
    if (!value) {
      return "";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "";
    }

    const offset = date.getTimezoneOffset();
    const localDate = new Date(date.getTime() - offset * 60_000);
    return localDate.toISOString().slice(0, 16);
  }

  const displayedClients = useMemo(
    () =>
      clients.map((client) => ({
        ...client,
        status: optimisticStatuses[client.id] ?? client.status,
        email: optimisticContacts[client.id]?.email ?? client.email,
        phone: optimisticContacts[client.id]?.phone ?? client.phone,
        last_contacted_at:
          optimisticContacts[client.id]?.last_contacted_at ?? client.last_contacted_at,
        tags: [
          ...(client.tags ?? []).filter(
            (tag) => !(optimisticTagRemovals[client.id] ?? []).includes(tag.id),
          ),
          ...(optimisticTagAdds[client.id] ?? []),
        ].filter(
          (tag, index, array) =>
            array.findIndex((candidate) => candidate.id === tag.id) === index,
        ),
      })),
    [clients, optimisticContacts, optimisticStatuses, optimisticTagAdds, optimisticTagRemovals],
  );

  const filteredClients = useMemo(() => {
    const normalizedQuery = deferredQuery.trim().toLowerCase();

    return displayedClients.filter((client) => {
      const matchesStatus =
        statusFilter === "all" ? true : client.status === statusFilter;

      if (!matchesStatus) {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      const haystack = [
        client.name,
        client.email,
        client.phone,
        client.notes,
        ...(client.tags?.map((tag) => tag.name) ?? []),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(normalizedQuery);
    });
  }, [deferredQuery, displayedClients, statusFilter]);

  async function updateClientStatus(clientId: string) {
    const selectedStatus =
      draftStatuses[clientId] ?? clients.find((client) => client.id === clientId)?.status;

    if (!selectedStatus) {
      return;
    }

    setOptimisticStatuses((current) => ({
      ...current,
      [clientId]: selectedStatus,
    }));
    const succeeded = await runAction({
      path: `/clients/${clientId}`,
      method: "PATCH",
      body: { status: selectedStatus },
      successMessage: "Client status updated.",
      defaultErrorMessage: "Status update failed.",
      pendingKey: `status:${clientId}`,
    });
    if (!succeeded) {
      setOptimisticStatuses((current) => {
        const next = { ...current };
        delete next[clientId];
        return next;
      });
    }
  }

  async function addClientTag(clientId: string) {
    const tagId = draftTagIds[clientId];

    if (!tagId) {
      return;
    }

    const tag = tags.find((candidate) => candidate.id === tagId);

    if (!tag) {
      return;
    }

    setOptimisticTagAdds((current) => ({
      ...current,
      [clientId]: [...(current[clientId] ?? []), tag],
    }));
    const succeeded = await runAction({
      path: "/client-tags/",
      method: "POST",
      body: { client_id: clientId, tag_id: tagId },
      successMessage: "Tag assigned to client.",
      defaultErrorMessage: "Tag assignment failed.",
      pendingKey: `add:${clientId}:${tagId}`,
    });
    if (!succeeded) {
      setOptimisticTagAdds((current) => ({
        ...current,
        [clientId]: (current[clientId] ?? []).filter((candidate) => candidate.id !== tagId),
      }));
    }
  }

  async function removeClientTag(clientId: string, tagId: string) {
    setOptimisticTagRemovals((current) => ({
      ...current,
      [clientId]: [...(current[clientId] ?? []), tagId],
    }));
    const succeeded = await runAction({
      path: `/client-tags/?client_id=${encodeURIComponent(clientId)}&tag_id=${encodeURIComponent(tagId)}`,
      method: "DELETE",
      successMessage: "Tag removed from client.",
      defaultErrorMessage: "Tag removal failed.",
      pendingKey: `remove:${clientId}:${tagId}`,
    });
    if (!succeeded) {
      setOptimisticTagRemovals((current) => ({
        ...current,
        [clientId]: (current[clientId] ?? []).filter((candidate) => candidate !== tagId),
      }));
    }
  }

  async function logClientActivity(clientId: string) {
    const interactionType = draftActivityTypes[clientId] ?? "note";
    const notes = draftActivityNotes[clientId]?.trim();

    if (!notes) {
      // Use the shared banner area for consistency with other actions.
      return;
    }
    const succeeded = await runAction({
      path: "/activity/",
      method: "POST",
      body: {
        client_id: clientId,
        interaction_type: interactionType,
        notes,
      },
      successMessage: "Activity logged from client card.",
      defaultErrorMessage: "Activity log failed.",
      pendingKey: `activity:${clientId}`,
    });
    if (succeeded) {
      setDraftActivityNotes((current) => ({
        ...current,
        [clientId]: "",
      }));
    }
  }

  async function updateClientContact(client: Client) {
    const email = draftEmails[client.id] ?? client.email ?? "";
    const phone = draftPhones[client.id] ?? client.phone ?? "";
    const lastContactedAt =
      draftLastContactedAt[client.id] ?? toLocalDatetimeValue(client.last_contacted_at);

    setOptimisticContacts((current) => ({
      ...current,
      [client.id]: {
        email: email || null,
        phone: phone || null,
        last_contacted_at: lastContactedAt ? new Date(lastContactedAt).toISOString() : null,
      },
    }));
    const succeeded = await runAction({
      path: `/clients/${client.id}`,
      method: "PATCH",
      body: {
        email: email || null,
        phone: phone || null,
        last_contacted_at: lastContactedAt
          ? new Date(lastContactedAt).toISOString()
          : null,
      },
      successMessage: "Client contact details updated.",
      defaultErrorMessage: "Contact update failed.",
      pendingKey: `contact:${client.id}`,
    });
    if (!succeeded) {
      setOptimisticContacts((current) => {
        const next = { ...current };
        delete next[client.id];
        return next;
      });
    }
  }

  return (
    <section
      id="client-dashboard"
      className="rounded-[34px] border border-(--color-line) bg-(--color-surface) p-6 shadow-(--shadow-md) backdrop-blur"
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-slate-500 dark:text-slate-400">
            Pipeline
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950 dark:text-stone-100">Clients</h2>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
            Connected source: <span className="font-medium text-white">{apiBaseUrl}</span>
          </p>
        </div>
        <div
          className={`w-fit rounded-full px-4 py-2 text-sm font-medium ${
            isFallback ? "bg-amber-100 text-amber-900" : "bg-emerald-100 text-emerald-900"
          }`}
        >
          {isFallback ? "Showing fallback data" : "Connected to API"}
        </div>
      </div>

      <div className="mt-6 rounded-[28px] border border-(--color-line) bg-(--color-surface) p-4">
        <div className="flex flex-col gap-3 lg:flex-row">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by name, contact info, notes, or tag"
            className="min-w-0 flex-1 rounded-[20px] border border-(--color-line) bg-white px-4 py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 dark:bg-white/8 dark:text-stone-100 dark:placeholder:text-slate-500"
          />
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
            className="rounded-[20px] border border-(--color-line) bg-white px-4 py-3 text-sm text-slate-900 outline-none dark:bg-white/8 dark:text-stone-100"
          >
            {statusOptions.map((option) => (
              <option key={option} value={option}>
                {option === "all" ? "All statuses" : option}
              </option>
            ))}
          </select>
        </div>
        <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
          Showing {filteredClients.length} of {displayedClients.length} clients
        </p>
        {error ? (
          <div className="mt-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
            {error}
          </div>
        ) : null}
        {success ? (
          <div className="mt-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            {success}
          </div>
        ) : null}
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {filteredClients.map((client) => (
          <div key={client.id} className="flex flex-col gap-3">
            <ClientCard client={client} />
            <div className="rounded-3xl border border-(--color-line) bg-(--color-surface) p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                Pipeline
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <select
                  value={draftStatuses[client.id] ?? client.status}
                  onChange={(event) =>
                    setDraftStatuses((current) => ({
                      ...current,
                      [client.id]: event.target.value as Client["status"],
                    }))
                  }
                  disabled={isFallback || pendingKey === `status:${client.id}`}
                  className="rounded-full border border-(--color-line) bg-white px-3 py-2 text-sm text-slate-900 outline-none disabled:opacity-50 dark:bg-white/8 dark:text-stone-100"
                >
                  {statusOptions
                    .filter((option): option is Client["status"] => option !== "all")
                    .map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                </select>
                <button
                  type="button"
                  onClick={() => updateClientStatus(client.id)}
                  disabled={isFallback || pendingKey !== null}
                  className="rounded-full bg-(--color-foreground) px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                >
                  {pendingKey === `status:${client.id}` ? "Saving..." : "Update status"}
                </button>
                <Link
                  href={`/?editClient=${encodeURIComponent(client.id)}#record-editor`}
                  className="inline-flex rounded-full border border-(--color-line) bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:bg-white/8 dark:text-stone-100 dark:hover:bg-white/12"
                >
                  Edit details
                </Link>
              </div>

              <div className="mt-4 border-t border-(--color-line) pt-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                  Tags
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {client.tags?.length ? (
                    client.tags.map((tag) => {
                      const actionKey = `remove:${client.id}:${tag.id}`;

                      return (
                        <button
                          key={tag.id}
                          type="button"
                          onClick={() => removeClientTag(client.id, tag.id)}
                          disabled={isFallback || pendingKey !== null}
                      className="rounded-full border border-(--color-line) bg-white px-3 py-1.5 text-xs font-medium text-slate-700 disabled:opacity-50"
                        >
                          {pendingKey === actionKey ? `Removing ${tag.name}...` : `${tag.name} x`}
                        </button>
                      );
                    })
                  ) : (
                    <p className="text-sm text-slate-500 dark:text-slate-400">No tags assigned.</p>
                  )}
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <select
                    value={draftTagIds[client.id] ?? ""}
                    onChange={(event) =>
                      setDraftTagIds((current) => ({
                        ...current,
                        [client.id]: event.target.value,
                      }))
                    }
                    disabled={isFallback || pendingKey !== null}
                    className="rounded-full border border-(--color-line) bg-white px-3 py-2 text-sm text-slate-900 outline-none disabled:opacity-50 dark:bg-white/8 dark:text-stone-100"
                  >
                    <option value="">Select tag</option>
                    {tags
                      .filter(
                        (tag) => !client.tags?.some((assignedTag) => assignedTag.id === tag.id),
                      )
                      .map((tag) => (
                        <option key={tag.id} value={tag.id}>
                          {tag.name}
                        </option>
                      ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => addClientTag(client.id)}
                    disabled={
                      isFallback ||
                      pendingKey !== null ||
                      !draftTagIds[client.id]
                    }
                    className="rounded-full bg-(--color-foreground) px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                  >
                    {pendingKey?.startsWith(`add:${client.id}:`)
                      ? "Adding..."
                      : "Add tag"}
                  </button>
                </div>

                <div className="mt-4 border-t border-(--color-line) pt-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                    Quick Activity
                  </p>
                  <div className="mt-3 flex flex-col gap-2">
                    <select
                      value={draftActivityTypes[client.id] ?? "note"}
                      onChange={(event) =>
                        setDraftActivityTypes((current) => ({
                          ...current,
                          [client.id]: event.target.value as ClientActivity["interaction_type"],
                        }))
                      }
                      disabled={isFallback || pendingKey !== null}
                      className="rounded-2xl border border-(--color-line) bg-white px-3 py-2 text-sm text-slate-900 outline-none disabled:opacity-50 dark:bg-white/8 dark:text-stone-100"
                    >
                      {interactionOptions.map((option) => (
                        <option key={option} value={option}>
                          {option.replace("_", " ")}
                        </option>
                      ))}
                    </select>
                    <textarea
                      value={draftActivityNotes[client.id] ?? ""}
                      onChange={(event) =>
                        setDraftActivityNotes((current) => ({
                          ...current,
                          [client.id]: event.target.value,
                        }))
                      }
                      rows={3}
                      placeholder="Log a quick follow-up note"
                      disabled={isFallback || pendingKey !== null}
                      className="rounded-2xl border border-(--color-line) bg-white px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400 disabled:opacity-50 dark:bg-white/8 dark:text-stone-100 dark:placeholder:text-slate-500"
                    />
                    <button
                      type="button"
                      onClick={() => logClientActivity(client.id)}
                      disabled={
                        isFallback ||
                        pendingKey !== null ||
                        !(draftActivityNotes[client.id] ?? "").trim()
                      }
                      className="w-fit rounded-full bg-(--color-foreground) px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                    >
                      {pendingKey === `activity:${client.id}` ? "Logging..." : "Log activity"}
                    </button>
                  </div>
                </div>

                <div className="mt-4 border-t border-(--color-line) pt-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                    Contact
                  </p>
                  <div className="mt-3 flex flex-col gap-2">
                    <input
                      type="email"
                      value={draftEmails[client.id] ?? client.email ?? ""}
                      onChange={(event) =>
                        setDraftEmails((current) => ({
                          ...current,
                          [client.id]: event.target.value,
                        }))
                      }
                      disabled={isFallback || pendingKey !== null}
                      placeholder="Email"
                      className="rounded-2xl border border-(--color-line) bg-white px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400 disabled:opacity-50 dark:bg-white/8 dark:text-stone-100 dark:placeholder:text-slate-500"
                    />
                    <input
                      value={draftPhones[client.id] ?? client.phone ?? ""}
                      onChange={(event) =>
                        setDraftPhones((current) => ({
                          ...current,
                          [client.id]: event.target.value,
                        }))
                      }
                      disabled={isFallback || pendingKey !== null}
                      placeholder="Phone"
                      className="rounded-2xl border border-(--color-line) bg-white px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400 disabled:opacity-50 dark:bg-white/8 dark:text-stone-100 dark:placeholder:text-slate-500"
                    />
                    <input
                      type="datetime-local"
                      value={
                        draftLastContactedAt[client.id] ??
                        toLocalDatetimeValue(client.last_contacted_at)
                      }
                      onChange={(event) =>
                        setDraftLastContactedAt((current) => ({
                          ...current,
                          [client.id]: event.target.value,
                        }))
                      }
                      disabled={isFallback || pendingKey !== null}
                      className="rounded-2xl border border-(--color-line) bg-white px-3 py-2 text-sm text-slate-900 outline-none disabled:opacity-50 dark:bg-white/8 dark:text-stone-100"
                    />
                    <button
                      type="button"
                      onClick={() => updateClientContact(client)}
                      disabled={isFallback || pendingKey !== null}
                      className="w-fit rounded-full bg-(--color-foreground) px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                    >
                      {pendingKey === `contact:${client.id}` ? "Saving..." : "Update contact"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
