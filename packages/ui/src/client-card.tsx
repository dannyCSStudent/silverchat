import Image from "next/image";
import { useState } from "react";
import type { Client } from "@repo/types";
import { getClientAppearance } from "./client-appearance";

type ClientCardClient = Pick<
  Client,
  | "name"
  | "status"
  | "email"
  | "phone"
  | "last_contacted_at"
  | "tags"
  | "profile_image_url"
  | "banner_image_url"
>;

const statusClassName: Record<Client["status"], string> = {
  lead: "border-amber-200/80 bg-amber-100/92 text-amber-900",
  active: "border-emerald-200/80 bg-emerald-100/92 text-emerald-900",
  completed: "border-slate-200/80 bg-slate-100/92 text-slate-700",
};

const statusLabel: Record<Client["status"], string> = {
  lead: "Lead",
  active: "Active",
  completed: "Completed",
};

export function ClientCard({ client }: { client: ClientCardClient }) {
  const appearance = getClientAppearance(client.name, client.status);
  const [bannerFailed, setBannerFailed] = useState(false);
  const [profileFailed, setProfileFailed] = useState(false);
  const contactValue = client.email ?? client.phone ?? "No contact details yet";
  const lastContactedLabel = client.last_contacted_at
    ? new Date(client.last_contacted_at).toLocaleDateString()
    : "Not scheduled";

  return (
    <article className="overflow-hidden rounded-[30px] border border-(--color-line) bg-(--color-surface-strong) shadow-(--shadow-md) backdrop-blur">
      <div
        className="relative min-h-63 border-b border-white/10"
        style={{
          backgroundImage: `${appearance.accentDots}, ${appearance.bannerBackground}`,
        }}
      >
        {client.banner_image_url && !bannerFailed ? (
          <Image
            src={client.banner_image_url}
            alt={`${client.name} banner`}
            fill
            sizes="(min-width: 1280px) 24rem, (min-width: 768px) 50vw, 100vw"
            className="object-cover"
            onError={() => setBannerFailed(true)}
          />
        ) : null}

        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(15,23,42,0.12),rgba(15,23,42,0.78))]" />

        <div className="relative flex min-h-63 flex-col justify-between gap-5 p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="rounded-full border border-white/14 bg-black/20 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/80 backdrop-blur">
              Client record
            </div>
            <span
              className={`inline-flex h-8 min-w-24 shrink-0 items-center justify-center rounded-full border px-3 text-center text-[11px] font-semibold uppercase tracking-[0.14em] backdrop-blur ${statusClassName[client.status]}`}
            >
              {statusLabel[client.status]}
            </span>
          </div>

          <div className="flex min-w-0 items-end gap-4">
            <div
              className="relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-[22px] border-4 text-sm font-semibold shadow-[0_18px_40px_rgba(15,23,42,0.24)]"
              style={{
                backgroundImage: appearance.avatarBackground,
                color: appearance.avatarText,
                borderColor: appearance.avatarText,
              }}
            >
              {client.profile_image_url && !profileFailed ? (
                <Image
                  src={client.profile_image_url}
                  alt={`${client.name} profile`}
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
              <h2 className="truncate text-xl font-semibold tracking-tight text-white">
                {client.name}
              </h2>
              <p className="mt-1 truncate text-sm text-white/78">{contactValue}</p>
            </div>
          </div>

          <div className="rounded-3xl border border-white/14 bg-black/34 p-4 text-white backdrop-blur-md">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/70">
                  Contact rhythm
                </p>
                <p className="mt-2 truncate text-sm font-medium text-white">{contactValue}</p>
              </div>
              <div className="rounded-full border border-white/14 bg-white/12 px-3 py-1.5 text-xs font-medium text-white/90">
                Last contact {lastContactedLabel}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="p-5">
        <div className="rounded-3xl border border-(--color-line) bg-(--color-chip-surface) px-4 py-4">
          <div className="flex items-center justify-between gap-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-(--color-muted)">
              Tags
            </p>
            <p className="text-xs font-medium text-(--color-muted)">
              {(client.tags?.length ?? 0).toString().padStart(2, "0")} linked
            </p>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {client.tags?.length ? (
              client.tags.slice(0, 4).map((tag) => (
                <span
                  key={tag.id}
                  className="inline-flex items-center rounded-full border border-(--color-line) bg-(--color-surface-strong) px-3 py-1.5 text-xs font-semibold text-(--color-foreground)"
                >
                  {tag.name}
                </span>
              ))
            ) : (
              <span className="text-sm text-(--color-muted)">
                No tags assigned
              </span>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
