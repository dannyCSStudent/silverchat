"use client";

import { useState } from "react";

import { useDashboardAction } from "../use-dashboard-action";

type ReportNotesProps = {
  reportId: string;
};

export function ReportNotes({ reportId }: ReportNotesProps) {
  const { clearMessages, error, pendingKey, runAction, success } = useDashboardAction("");
  const [note, setNote] = useState("");

  return (
    <div className="mt-4 rounded-2xl border border-(--color-line) bg-(--color-surface-strong) p-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
        Moderator note
      </p>
      <textarea
        value={note}
        onChange={(event) => setNote(event.target.value)}
        placeholder="Add context for the next moderator..."
        className="mt-3 min-h-24 w-full rounded-2xl border border-(--color-line) bg-(--color-surface) px-4 py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 dark:text-stone-100"
      />
      <div className="mt-3 flex items-center gap-3">
        <button
          type="button"
          disabled={pendingKey !== null || note.trim().length === 0}
          onClick={() => {
            const trimmedNote = note.trim();
            if (!trimmedNote) {
              return;
            }

            void runAction({
              path: `/api/admin/reports/${reportId}/notes`,
              method: "POST",
              body: { note: trimmedNote },
              successMessage: "Moderator note saved.",
              defaultErrorMessage: "Unable to save moderator note.",
              pendingKey: `${reportId}:note`,
            }).then((didSucceed) => {
              if (didSucceed) {
                setNote("");
              }
            });
          }}
          className="rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white transition hover:opacity-92 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-stone-100 dark:text-slate-950"
        >
          {pendingKey === `${reportId}:note` ? "Saving..." : "Save note"}
        </button>
        {success ? (
          <button
            type="button"
            onClick={clearMessages}
            className="text-left text-xs font-medium text-emerald-700 dark:text-emerald-300"
          >
            {success}
          </button>
        ) : null}
        {error ? (
          <button
            type="button"
            onClick={clearMessages}
            className="text-left text-xs font-medium text-rose-700 dark:text-rose-300"
          >
            {error}
          </button>
        ) : null}
      </div>
    </div>
  );
}
