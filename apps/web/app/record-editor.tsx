"use client";

import Image from "next/image";
import type {
  Client,
  ClientActivity,
  ClientInteractionType,
  ClientStatus,
} from "@repo/types";
import { useState } from "react";
import { useDashboardAction } from "./use-dashboard-action";

const statusOptions: ClientStatus[] = ["lead", "active", "completed"];
const interactionOptions: ClientInteractionType[] = [
  "call",
  "email",
  "meeting",
  "note",
  "follow_up",
];

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

export function RecordEditor({
  apiBaseUrl,
  clients,
  activity,
  isFallback,
  initialClientId,
  initialActivityId,
}: {
  apiBaseUrl: string;
  clients: Client[];
  activity: ClientActivity[];
  isFallback: boolean;
  initialClientId?: string;
  initialActivityId?: string;
}) {
  const { error, success, pendingKey, runAction } = useDashboardAction(apiBaseUrl);
  const defaultClient =
    clients.find((client) => client.id === initialClientId) ?? clients[0];
  const defaultActivity =
    activity.find((item) => item.id === initialActivityId) ?? activity[0];
  const [selectedClientId, setSelectedClientId] = useState<string>(defaultClient?.id ?? "");
  const [selectedActivityId, setSelectedActivityId] = useState<string>(defaultActivity?.id ?? "");
  const [clientStatus, setClientStatus] = useState<ClientStatus>(defaultClient?.status ?? "lead");
  const [clientEmail, setClientEmail] = useState(defaultClient?.email ?? "");
  const [clientPhone, setClientPhone] = useState(defaultClient?.phone ?? "");
  const [clientProfileImageUrl, setClientProfileImageUrl] = useState(
    defaultClient?.profile_image_url ?? "",
  );
  const [clientBannerImageUrl, setClientBannerImageUrl] = useState(
    defaultClient?.banner_image_url ?? "",
  );
  const [clientProfileImageFailed, setClientProfileImageFailed] = useState(false);
  const [clientBannerImageFailed, setClientBannerImageFailed] = useState(false);
  const [clientNotes, setClientNotes] = useState(defaultClient?.notes ?? "");
  const [clientLastContactedAt, setClientLastContactedAt] = useState(
    toLocalDatetimeValue(defaultClient?.last_contacted_at),
  );
  const [activityInteractionType, setActivityInteractionType] = useState<ClientInteractionType>(
    defaultActivity?.interaction_type ?? "note",
  );
  const [activityNotes, setActivityNotes] = useState(defaultActivity?.notes ?? "");
  const [activityTimestamp, setActivityTimestamp] = useState(
    toLocalDatetimeValue(defaultActivity?.timestamp),
  );

  async function patchJson(
    actionKey: string,
    path: string,
    payload: object,
    successMessage: string,
  ) {
    await runAction({
      path,
      method: "PATCH",
      body: payload,
      successMessage,
      defaultErrorMessage: "Update failed.",
      pendingKey: actionKey,
    });
  }

  return (
    <section
      id="record-editor"
      className="rounded-[34px] border border-(--color-line) bg-(--color-surface) p-6 shadow-(--shadow-md) backdrop-blur"
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-slate-500">
            Edit
          </p>
          <h3 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
            Edit records
          </h3>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Direct update surfaces for contact, status, notes, and timeline entries.
          </p>
        </div>
        {isFallback ? (
          <p className="rounded-full bg-amber-100 px-4 py-2 text-sm font-medium text-amber-900">
            API offline: update actions are disabled until the backend is running.
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

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <form
          className="rounded-[28px] border border-(--color-line) bg-white p-5"
          onSubmit={async (event) => {
            event.preventDefault();
            const payload: Record<string, string | null> & { status: ClientStatus } = {
              status: clientStatus,
              email: clientEmail || null,
              phone: clientPhone || null,
              notes: clientNotes || null,
              last_contacted_at: clientLastContactedAt
                ? new Date(clientLastContactedAt).toISOString()
                : null,
            };

            if (clientProfileImageUrl.trim()) {
              payload.profile_image_url = clientProfileImageUrl.trim();
            }

            if (clientBannerImageUrl.trim()) {
              payload.banner_image_url = clientBannerImageUrl.trim();
            }

            await patchJson(
              `client:${selectedClientId}`,
              `/clients/${selectedClientId}`,
              payload,
              "Client updated.",
            );
          }}
        >
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            Client
          </p>
          <h4 className="mt-2 text-lg font-semibold text-slate-950">Update client</h4>
          <div className="mt-4 space-y-3">
            <select
              required
              name="client_id"
              value={selectedClientId}
              onChange={(event) => {
                const nextClient =
                  clients.find((client) => client.id === event.target.value) ?? clients[0];

                if (!nextClient) {
                  return;
                }

                setSelectedClientId(nextClient.id);
                setClientStatus(nextClient.status);
                setClientEmail(nextClient.email ?? "");
                setClientPhone(nextClient.phone ?? "");
                setClientProfileImageUrl(nextClient.profile_image_url ?? "");
                setClientBannerImageUrl(nextClient.banner_image_url ?? "");
                setClientProfileImageFailed(false);
                setClientBannerImageFailed(false);
                setClientNotes(nextClient.notes ?? "");
                setClientLastContactedAt(
                  toLocalDatetimeValue(nextClient.last_contacted_at),
                );
              }}
              className="w-full rounded-[20px] border border-(--color-line) px-4 py-3 text-sm text-slate-900 outline-none"
            >
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name} ({client.status})
                </option>
              ))}
            </select>
            <select
              name="status"
              value={clientStatus}
              onChange={(event) => setClientStatus(event.target.value as ClientStatus)}
              className="w-full rounded-[20px] border border-(--color-line) px-4 py-3 text-sm text-slate-900 outline-none"
            >
              {statusOptions.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
            <input
              name="email"
              type="email"
              value={clientEmail}
              onChange={(event) => setClientEmail(event.target.value)}
              placeholder="Email"
              className="w-full rounded-[20px] border border-(--color-line) px-4 py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400"
            />
            <input
              name="phone"
              value={clientPhone}
              onChange={(event) => setClientPhone(event.target.value)}
              placeholder="Phone"
              className="w-full rounded-[20px] border border-(--color-line) px-4 py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400"
            />
            <input
              name="profile_image_url"
              value={clientProfileImageUrl}
              onChange={(event) => {
                setClientProfileImageFailed(false);
                setClientProfileImageUrl(event.target.value);
              }}
              placeholder="Profile image URL"
              className="w-full rounded-[20px] border border-(--color-line) px-4 py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400"
            />
            <p className="text-xs leading-5 text-slate-500">
              Profile image: square headshot works best. Use a direct `https://` image URL.
            </p>
            <input
              name="banner_image_url"
              value={clientBannerImageUrl}
              onChange={(event) => {
                setClientBannerImageFailed(false);
                setClientBannerImageUrl(event.target.value);
              }}
              placeholder="Banner image URL"
              className="w-full rounded-[20px] border border-(--color-line) px-4 py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400"
            />
            <p className="text-xs leading-5 text-slate-500">
              Banner image: wide image works best, roughly 3:1 or 4:1.
            </p>
            {clientProfileImageUrl || clientBannerImageUrl ? (
              <div className="rounded-[22px] border border-(--color-line) bg-(--color-surface-strong) p-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Image preview
                </p>
                <div className="mt-3">
                  <div className="relative h-24 overflow-hidden rounded-[18px] bg-slate-200">
                    {clientBannerImageUrl && !clientBannerImageFailed ? (
                      <Image
                        src={clientBannerImageUrl}
                        alt="Banner preview"
                        fill
                        sizes="320px"
                        className="object-cover"
                        onError={() => setClientBannerImageFailed(true)}
                      />
                    ) : null}
                  </div>
                  <div className="-mt-7 ml-4 flex h-14 w-14 items-center justify-center overflow-hidden rounded-[18px] border-2 border-white bg-[#F3D8CA] text-sm font-semibold text-[#9F4B2B]">
                    {clientProfileImageUrl && !clientProfileImageFailed ? (
                      <Image
                        src={clientProfileImageUrl}
                        alt="Profile preview"
                        width={56}
                        height={56}
                        className="h-full w-full object-cover"
                        onError={() => setClientProfileImageFailed(true)}
                      />
                    ) : (
                      (clients.find((client) => client.id === selectedClientId)?.name ?? "?")
                        .slice(0, 1)
                        .toUpperCase()
                    )}
                  </div>
                </div>
              </div>
            ) : null}
            <input
              name="last_contacted_at"
              type="datetime-local"
              value={clientLastContactedAt}
              onChange={(event) => setClientLastContactedAt(event.target.value)}
              className="w-full rounded-[20px] border border-(--color-line) px-4 py-3 text-sm text-slate-900 outline-none"
            />
            <textarea
              name="notes"
              rows={5}
              value={clientNotes}
              onChange={(event) => setClientNotes(event.target.value)}
              placeholder="Replace client notes"
              className="w-full rounded-[20px] border border-(--color-line) px-4 py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400"
            />
          </div>
          <button
            type="submit"
            disabled={Boolean(isFallback || pendingKey) || clients.length === 0 || !selectedClientId}
            className="mt-4 rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {pendingKey?.startsWith("client:") ? "Saving..." : "Update client"}
          </button>
        </form>

        <form
          className="rounded-[28px] border border-(--color-line) bg-white p-5"
          onSubmit={async (event) => {
            event.preventDefault();
            await patchJson(
              `activity:${selectedActivityId}`,
              `/activity/${selectedActivityId}`,
              {
                interaction_type: activityInteractionType,
                notes: activityNotes || null,
                timestamp: activityTimestamp ? new Date(activityTimestamp).toISOString() : null,
              },
              "Activity updated.",
            );
          }}
        >
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            Timeline
          </p>
          <h4 className="mt-2 text-lg font-semibold text-slate-950">Update activity</h4>
          <div className="mt-4 space-y-3">
            <select
              required
              name="activity_id"
              value={selectedActivityId}
              onChange={(event) => {
                const nextActivity =
                  activity.find((item) => item.id === event.target.value) ?? activity[0];

                if (!nextActivity) {
                  return;
                }

                setSelectedActivityId(nextActivity.id);
                setActivityInteractionType(nextActivity.interaction_type);
                setActivityNotes(nextActivity.notes ?? "");
                setActivityTimestamp(toLocalDatetimeValue(nextActivity.timestamp));
              }}
              className="w-full rounded-[20px] border border-(--color-line) px-4 py-3 text-sm text-slate-900 outline-none"
            >
              {activity.map((item) => {
                const clientName =
                  clients.find((client) => client.id === item.client_id)?.name ?? "Unknown client";

                return (
                  <option key={item.id} value={item.id}>
                    {clientName} - {item.interaction_type}
                  </option>
                );
              })}
            </select>
            <select
              name="interaction_type"
              value={activityInteractionType}
              onChange={(event) =>
                setActivityInteractionType(event.target.value as ClientInteractionType)
              }
              className="w-full rounded-[20px] border border-(--color-line) px-4 py-3 text-sm text-slate-900 outline-none"
            >
              {interactionOptions.map((option) => (
                <option key={option} value={option}>
                  {option.replace("_", " ")}
                </option>
              ))}
            </select>
            <input
              name="timestamp"
              type="datetime-local"
              value={activityTimestamp}
              onChange={(event) => setActivityTimestamp(event.target.value)}
              className="w-full rounded-[20px] border border-(--color-line) px-4 py-3 text-sm text-slate-900 outline-none"
            />
            <textarea
              required
              name="notes"
              rows={5}
              value={activityNotes}
              onChange={(event) => setActivityNotes(event.target.value)}
              placeholder="Replace activity notes"
              className="w-full rounded-[20px] border border-(--color-line) px-4 py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400"
            />
          </div>
          <button
            type="submit"
            disabled={
              Boolean(isFallback || pendingKey) || activity.length === 0 || !selectedActivityId
            }
            className="mt-4 rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {pendingKey?.startsWith("activity:") ? "Saving..." : "Update activity"}
          </button>
        </form>
      </div>
    </section>
  );
}
