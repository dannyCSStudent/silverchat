"use client";

import type { Client, ClientActivity } from "@repo/types";
import { getClientAppearance } from "@repo/ui";
import Image from "next/image";
import Link from "next/link";
import { useDeferredValue, useMemo, useState } from "react";

type ActivityDashboardProps = {
  clients: Client[];
  activity: ClientActivity[];
};

type InteractionFilter = "all" | ClientActivity["interaction_type"];

type TimelineCardProps = {
  client?: Client;
  item: ClientActivity;
};

const interactionOptions: InteractionFilter[] = [
  "all",
  "call",
  "email",
  "meeting",
  "note",
  "follow_up",
];

const interactionToneClassName: Record<ClientActivity["interaction_type"], string> = {
  follow_up: "border-amber-200/80 bg-amber-100/92 text-amber-900",
  meeting: "border-sky-200/80 bg-sky-100/92 text-sky-900",
  email: "border-violet-200/80 bg-violet-100/92 text-violet-900",
  call: "border-emerald-200/80 bg-emerald-100/92 text-emerald-900",
  note: "border-white/20 bg-[rgba(255,248,240,0.94)] text-slate-800",
};

function TimelineCard({ client, item }: TimelineCardProps) {
  const fallbackName = client?.name ?? "Unknown client";
  const fallbackStatus = client?.status ?? "lead";
  const appearance = getClientAppearance(fallbackName, fallbackStatus);
  const [bannerFailed, setBannerFailed] = useState(false);
  const [profileFailed, setProfileFailed] = useState(false);

  return (
    <article className="overflow-hidden rounded-[28px] border border-(--color-line) bg-(--color-surface-strong) shadow-(--shadow-md)">
      <div
        className="relative min-h-62"
        style={{
          backgroundImage: `${appearance.accentDots}, ${appearance.bannerBackground}`,
        }}
      >
        {client?.banner_image_url && !bannerFailed ? (
          <Image
            src={client.banner_image_url}
            alt={`${fallbackName} banner`}
            fill
            sizes="(min-width: 1280px) 38rem, 100vw"
            className="object-cover"
            onError={() => setBannerFailed(true)}
          />
        ) : null}

        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(15,23,42,0.14),rgba(15,23,42,0.78))]" />

        <div className="relative flex  flex-col justify-between gap-6 p-5 sm:p-6">
          <div className="flex flex-wrap items-starmin-h-[248px]t justify-between gap-3">
            <span
              className={`inline-flex h-8 items-center justify-center rounded-full border px-3 text-[11px] font-semibold uppercase tracking-[0.16em] backdrop-blur ${interactionToneClassName[item.interaction_type]}`}
            >
              {item.interaction_type.replace("_", " ")}
            </span>

            <div className="rounded-full border border-white/14 bg-black/20 px-3 py-1.5 text-xs font-medium text-white/84 backdrop-blur">
              {new Date(item.timestamp).toLocaleDateString()}
            </div>
          </div>

          <div className="flex items-end gap-4">
            <div
              className="relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-[22px] border-4 text-sm font-semibold shadow-[0_18px_40px_rgba(15,23,42,0.24)]"
              style={{
                backgroundImage: appearance.avatarBackground,
                color: appearance.avatarText,
                borderColor: appearance.avatarText,
              }}
            >
              {client?.profile_image_url && !profileFailed ? (
                <Image
                  src={client.profile_image_url}
                  alt={`${fallbackName} profile`}
                  fill
                  sizes="64px"
                  className="object-cover"
                  onError={() => setProfileFailed(true)}
                />
              ) : (
                appearance.initials
              )}
            </div>

            <div className="min-w-0 flex-1">
              <h4 className="truncate text-xl font-semibold tracking-tight text-white">
                {fallbackName}
              </h4>
              <p className="mt-1 truncate text-sm text-white/78">
                {client?.email ?? client?.phone ?? "No contact details yet"}
              </p>
            </div>
          </div>

          <div className="rounded-3xl border border-white/14 bg-black/34 p-4 text-white backdrop-blur-md">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/70">
              Timeline note
            </p>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-white">
              {item.notes ?? "No notes attached."}
            </p>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <div className="rounded-full border border-white/14 bg-white/12 px-3 py-1.5 text-xs font-medium text-white/90">
                Timeline entry
              </div>
              <Link
                href={`/?editActivity=${encodeURIComponent(item.id)}#record-editor`}
                className="inline-flex rounded-full border border-white/16 bg-[rgba(255,248,240,0.94)] px-3 py-1.5 text-xs font-semibold text-slate-950 transition-opacity hover:opacity-92"
              >
                Edit activity
              </Link>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}

export function ActivityDashboard({ clients, activity }: ActivityDashboardProps) {
  const [clientFilter, setClientFilter] = useState<string>("all");
  const [interactionFilter, setInteractionFilter] = useState<InteractionFilter>("all");
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);

  const filteredActivity = useMemo(() => {
    const normalizedQuery = deferredQuery.trim().toLowerCase();

    return activity.filter((item) => {
      const matchesClient = clientFilter === "all" ? true : item.client_id === clientFilter;
      const matchesInteraction =
        interactionFilter === "all" ? true : item.interaction_type === interactionFilter;

      if (!matchesClient || !matchesInteraction) {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      const clientName = clients.find((client) => client.id === item.client_id)?.name ?? "";
      const haystack = `${clientName} ${item.notes ?? ""}`.toLowerCase();
      return haystack.includes(normalizedQuery);
    });
  }, [activity, clientFilter, clients, deferredQuery, interactionFilter]);

  return (
    <div className="rounded-[34px] border border-(--color-line) bg-(--color-surface) p-6 shadow-(--shadow-md) backdrop-blur">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-slate-500 dark:text-slate-400">
            Timeline
          </p>
          <h3 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950 dark:text-stone-100">
            Relationship history
          </h3>
          <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
            Filter by client, interaction type, or note text to isolate the exact moment that
            needs attention.
          </p>
        </div>
        <div className="rounded-full border border-(--color-line) bg-(--color-chip-surface) px-4 py-2 text-sm text-slate-600 dark:text-slate-300">
          Showing {filteredActivity.length} of {activity.length} entries
        </div>
      </div>

      <div className="mt-6 grid gap-3 md:grid-cols-3">
        <select
          value={clientFilter}
          onChange={(event) => setClientFilter(event.target.value)}
          className="rounded-[20px] border border-(--color-line) bg-(--color-surface-strong) px-4 py-3 text-sm text-(--color-foreground) outline-none"
        >
          <option value="all">All clients</option>
          {clients.map((client) => (
            <option key={client.id} value={client.id}>
              {client.name}
            </option>
          ))}
        </select>

        <select
          value={interactionFilter}
          onChange={(event) => setInteractionFilter(event.target.value as InteractionFilter)}
          className="rounded-[20px] border border-(--color-line) bg-(--color-surface-strong) px-4 py-3 text-sm text-(--color-foreground) outline-none"
        >
          {interactionOptions.map((option) => (
            <option key={option} value={option}>
              {option === "all" ? "All interaction types" : option.replace("_", " ")}
            </option>
          ))}
        </select>

        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search activity notes"
          className="rounded-[20px] border border-(--color-line) bg-(--color-surface-strong) px-4 py-3 text-sm text-(--color-foreground) outline-none placeholder:text-(--color-muted)"
        />
      </div>

      <div className="mt-6 space-y-4">
        {filteredActivity.map((item) => {
          const client = clients.find((entry) => entry.id === item.client_id);

          return <TimelineCard key={item.id} client={client} item={item} />;
        })}
      </div>
    </div>
  );
}
