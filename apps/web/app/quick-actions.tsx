"use client";

import Image from "next/image";
import type {
  Client,
  ClientActivity,
  ClientTag,
  ClientTagAssignment,
  ClientStatus,
} from "@repo/types";
import { useState } from "react";
import { useDashboardAction } from "./use-dashboard-action";

const interactionOptions: ClientActivity["interaction_type"][] = [
  "call",
  "email",
  "meeting",
  "note",
  "follow_up",
];

const statusOptions: ClientStatus[] = ["lead", "active", "completed"];

export function QuickActions({
  apiBaseUrl,
  clients,
  tags,
  isFallback,
}: {
  apiBaseUrl: string;
  clients: Client[];
  tags: ClientTag[];
  isFallback: boolean;
}) {
  const { error, success, pendingKey, runAction } = useDashboardAction(apiBaseUrl);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newClientName, setNewClientName] = useState("");
  const [newClientProfileImageUrl, setNewClientProfileImageUrl] = useState("");
  const [newClientBannerImageUrl, setNewClientBannerImageUrl] = useState("");
  const [newClientProfileImageFailed, setNewClientProfileImageFailed] = useState(false);
  const [newClientBannerImageFailed, setNewClientBannerImageFailed] = useState(false);

  async function submitJson(path: string, payload: object, successMessage: string) {
    setIsSubmitting(true);

    try {
      await runAction({
        path,
        method: "POST",
        body: payload,
        successMessage,
        defaultErrorMessage: "Unable to submit request.",
        pendingKey: `post:${path}`,
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="rounded-[34px] border border-(--color-line) bg-(--color-surface) p-6 shadow-(--shadow-md) backdrop-blur">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-slate-500">
            Create
          </p>
          <h3 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
            Quick actions
          </h3>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Structured creation flows for clients, tags, activity, and assignments without
            leaving the dashboard.
          </p>
        </div>
        {isFallback ? (
          <p className="rounded-full bg-amber-100 px-4 py-2 text-sm font-medium text-amber-900">
            API offline: submissions will fail until the backend is running.
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
        <form
          className="rounded-[28px] border border-(--color-line) bg-white p-5"
          onSubmit={async (event) => {
            event.preventDefault();
            const form = event.currentTarget;
            const formData = new FormData(form);

            await submitJson(
              "/clients/",
              {
                name: String(formData.get("name") ?? ""),
                email: String(formData.get("email") ?? "") || null,
                phone: String(formData.get("phone") ?? "") || null,
                ...(String(formData.get("profile_image_url") ?? "").trim()
                  ? { profile_image_url: String(formData.get("profile_image_url")).trim() }
                  : {}),
                ...(String(formData.get("banner_image_url") ?? "").trim()
                  ? { banner_image_url: String(formData.get("banner_image_url")).trim() }
                  : {}),
                status: String(formData.get("status") ?? "lead"),
                notes: String(formData.get("notes") ?? "") || null,
              },
              "Client created.",
            );

            form.reset();
            setNewClientName("");
            setNewClientProfileImageUrl("");
            setNewClientBannerImageUrl("");
            setNewClientProfileImageFailed(false);
            setNewClientBannerImageFailed(false);
          }}
        >
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            Client
          </p>
          <h4 className="mt-2 text-lg font-semibold text-slate-950">Add client</h4>
          <div className="mt-4 space-y-3">
            <input
              required
              name="name"
              value={newClientName}
              onChange={(event) => setNewClientName(event.target.value)}
              placeholder="Client name"
              className="w-full rounded-[20px] border border-(--color-line) px-4 py-3 text-sm text-slate-900 outline-none ring-0 placeholder:text-slate-400"
            />
            <input
              name="email"
              type="email"
              placeholder="Email"
              className="w-full rounded-[20px] border border-(--color-line) px-4 py-3 text-sm text-slate-900 outline-none ring-0 placeholder:text-slate-400"
            />
            <input
              name="phone"
              placeholder="Phone"
              className="w-full rounded-[20px] border border-(--color-line) px-4 py-3 text-sm text-slate-900 outline-none ring-0 placeholder:text-slate-400"
            />
            <input
              name="profile_image_url"
              value={newClientProfileImageUrl}
              onChange={(event) => {
                setNewClientProfileImageFailed(false);
                setNewClientProfileImageUrl(event.target.value);
              }}
              placeholder="Profile image URL"
              className="w-full rounded-[20px] border border-(--color-line) px-4 py-3 text-sm text-slate-900 outline-none ring-0 placeholder:text-slate-400"
            />
            <p className="text-xs leading-5 text-slate-500">
              Profile image: square headshot works best. Use a direct `https://` image URL.
            </p>
            <input
              name="banner_image_url"
              value={newClientBannerImageUrl}
              onChange={(event) => {
                setNewClientBannerImageFailed(false);
                setNewClientBannerImageUrl(event.target.value);
              }}
              placeholder="Banner image URL"
              className="w-full rounded-[20px] border border-(--color-line) px-4 py-3 text-sm text-slate-900 outline-none ring-0 placeholder:text-slate-400"
            />
            <p className="text-xs leading-5 text-slate-500">
              Banner image: wide image works best, roughly 3:1 or 4:1.
            </p>
            {newClientProfileImageUrl || newClientBannerImageUrl ? (
              <div className="rounded-[22px] border border-(--color-line) bg-(--color-surface-strong) p-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Image preview
                </p>
                <div className="mt-3">
                  <div className="relative h-24 overflow-hidden rounded-[18px] bg-slate-200">
                    {newClientBannerImageUrl && !newClientBannerImageFailed ? (
                      <Image
                        src={newClientBannerImageUrl}
                        alt="Banner preview"
                        fill
                        sizes="320px"
                        className="object-cover"
                        onError={() => setNewClientBannerImageFailed(true)}
                      />
                    ) : null}
                  </div>
                  <div className="-mt-7 ml-4 flex h-14 w-14 items-center justify-center overflow-hidden rounded-[18px] border-2 border-white bg-[#F3D8CA] text-sm font-semibold text-[#9F4B2B]">
                    {newClientProfileImageUrl && !newClientProfileImageFailed ? (
                      <Image
                        src={newClientProfileImageUrl}
                        alt="Profile preview"
                        width={56}
                        height={56}
                        className="h-full w-full object-cover"
                        onError={() => setNewClientProfileImageFailed(true)}
                      />
                    ) : (
                      (newClientName || "?").slice(0, 1).toUpperCase()
                    )}
                  </div>
                </div>
              </div>
            ) : null}
            <select
              name="status"
              defaultValue="lead"
              className="w-full rounded-[20px] border border-(--color-line) px-4 py-3 text-sm text-slate-900 outline-none"
            >
              {statusOptions.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
            <textarea
              name="notes"
              rows={3}
              placeholder="Notes"
              className="w-full rounded-[20px] border border-(--color-line) px-4 py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400"
            />
          </div>
          <button
            type="submit"
            disabled={isSubmitting}
            className="mt-4 rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {isSubmitting || pendingKey === "post:/clients/" ? "Saving..." : "Create client"}
          </button>
        </form>

        <form
          className="rounded-[28px] border border-(--color-line) bg-white p-5"
          onSubmit={async (event) => {
            event.preventDefault();
            const form = event.currentTarget;
            const formData = new FormData(form);

            await submitJson(
              "/tags/",
              {
                name: String(formData.get("name") ?? ""),
                color: String(formData.get("color") ?? "#0f172a"),
              } satisfies Omit<ClientTag, "id">,
              "Tag created.",
            );

            form.reset();
          }}
        >
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            Taxonomy
          </p>
          <h4 className="mt-2 text-lg font-semibold text-slate-950">Add tag</h4>
          <div className="mt-4 space-y-3">
            <input
              required
              name="name"
              placeholder="Tag name"
              className="w-full rounded-[20px] border border-(--color-line) px-4 py-3 text-sm text-slate-900 outline-none ring-0 placeholder:text-slate-400"
            />
            <input
              required
              name="color"
              type="color"
              defaultValue="#0f172a"
              className="h-12 w-full rounded-[20px] border border-(--color-line) px-2 py-2"
            />
          </div>
          <button
            type="submit"
            disabled={isSubmitting}
            className="mt-4 rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {isSubmitting || pendingKey === "post:/tags/" ? "Saving..." : "Create tag"}
          </button>
        </form>

        <form
          className="rounded-[28px] border border-(--color-line) bg-white p-5"
          onSubmit={async (event) => {
            event.preventDefault();
            const form = event.currentTarget;
            const formData = new FormData(form);

            await submitJson(
              "/activity/",
              {
                client_id: String(formData.get("client_id") ?? ""),
                interaction_type: String(formData.get("interaction_type") ?? "note"),
                notes: String(formData.get("notes") ?? "") || null,
              },
              "Activity logged.",
            );

            form.reset();
          }}
        >
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            Timeline
          </p>
          <h4 className="mt-2 text-lg font-semibold text-slate-950">Log activity</h4>
          <div className="mt-4 space-y-3">
            <select
              required
              name="client_id"
              defaultValue=""
              className="w-full rounded-[20px] border border-(--color-line) px-4 py-3 text-sm text-slate-900 outline-none"
            >
              <option value="" disabled>
                Select client
              </option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name}
                </option>
              ))}
            </select>
            <select
              name="interaction_type"
              defaultValue="note"
              className="w-full rounded-[20px] border border-(--color-line) px-4 py-3 text-sm text-slate-900 outline-none"
            >
              {interactionOptions.map((option) => (
                <option key={option} value={option}>
                  {option.replace("_", " ")}
                </option>
              ))}
            </select>
            <textarea
              required
              name="notes"
              rows={4}
              placeholder="What happened?"
              className="w-full rounded-[20px] border border-(--color-line) px-4 py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400"
            />
          </div>
          <button
            type="submit"
            disabled={isSubmitting || clients.length === 0}
            className="mt-4 rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {isSubmitting || pendingKey === "post:/activity/" ? "Saving..." : "Create activity"}
          </button>
        </form>

        <form
          className="rounded-[28px] border border-(--color-line) bg-white p-5"
          onSubmit={async (event) => {
            event.preventDefault();
            const form = event.currentTarget;
            const formData = new FormData(form);

            await submitJson(
              "/client-tags/",
              {
                client_id: String(formData.get("client_id") ?? ""),
                tag_id: String(formData.get("tag_id") ?? ""),
              } satisfies ClientTagAssignment,
              "Tag assigned to client.",
            );

            form.reset();
          }}
        >
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            Assignment
          </p>
          <h4 className="mt-2 text-lg font-semibold text-slate-950">Assign tag</h4>
          <div className="mt-4 space-y-3">
            <select
              required
              name="client_id"
              defaultValue=""
              className="w-full rounded-[20px] border border-(--color-line) px-4 py-3 text-sm text-slate-900 outline-none"
            >
              <option value="" disabled>
                Select client
              </option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name}
                </option>
              ))}
            </select>
            <select
              required
              name="tag_id"
              defaultValue=""
              className="w-full rounded-[20px] border border-(--color-line) px-4 py-3 text-sm text-slate-900 outline-none"
            >
              <option value="" disabled>
                Select tag
              </option>
              {tags.map((tag) => (
                <option key={tag.id} value={tag.id}>
                  {tag.name}
                </option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            disabled={isSubmitting || clients.length === 0 || tags.length === 0}
            className="mt-4 rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {isSubmitting || pendingKey === "post:/client-tags/" ? "Saving..." : "Assign tag"}
          </button>
        </form>
      </div>
    </section>
  );
}
