"use client";

import { setBriefSnooze } from "@/app/actions/briefs";
import { useState, useTransition } from "react";

const PRESETS = [
  { value: "later_today", label: "Later today" },
  { value: "tomorrow", label: "Tomorrow" },
  { value: "next_week", label: "Next week" },
] as const;

export default function SnoozeButton({
  briefId,
  snoozeUntil,
}: {
  briefId: string;
  snoozeUntil?: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function updateSnooze(preset: string | null) {
    setError(null);
    startTransition(async () => {
      const result = await setBriefSnooze(briefId, preset);
      if (!result.success) setError(result.message);
      else setExpanded(false);
    });
  }

  if (snoozeUntil) {
    return (
      <div>
        <button
          type="button"
          disabled={isPending}
          onClick={() => updateSnooze(null)}
          className="rounded-md bg-slate-700 px-3 py-1 text-sm text-white transition hover:bg-slate-600 disabled:cursor-wait disabled:opacity-60"
        >
          {isPending ? "Restoring…" : "Restore now"}
        </button>
        {error && <p role="alert" className="mt-2 text-xs text-red-400">{error}</p>}
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        type="button"
        disabled={isPending}
        aria-expanded={expanded}
        onClick={() => setExpanded((current) => !current)}
        className="rounded-md bg-slate-700 px-3 py-1 text-sm text-white transition hover:bg-slate-600 disabled:cursor-wait disabled:opacity-60"
      >
        {isPending ? "Snoozing…" : "Snooze"}
      </button>
      {expanded && (
        <div className="absolute bottom-full left-0 z-10 mb-2 w-40 overflow-hidden rounded-lg border border-slate-600 bg-slate-900 shadow-xl">
          {PRESETS.map((preset) => (
            <button
              key={preset.value}
              type="button"
              onClick={() => updateSnooze(preset.value)}
              className="block w-full px-4 py-2 text-left text-sm text-slate-200 hover:bg-slate-700"
            >
              {preset.label}
            </button>
          ))}
        </div>
      )}
      {error && (
        <p role="alert" className="absolute left-0 top-full mt-2 w-64 text-xs text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}
