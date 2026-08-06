"use client";

import { setBriefPinned } from "@/app/actions/briefs";
import { useState, useTransition } from "react";

export default function PinButton({ briefId, pinned }: { briefId: string; pinned: boolean }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div>
      <button
        type="button"
        disabled={isPending}
        aria-pressed={pinned}
        onClick={() => {
          setError(null);
          startTransition(async () => {
            const result = await setBriefPinned(briefId, !pinned);
            if (!result.success) setError(result.message);
          });
        }}
        className={`rounded-md px-3 py-1 text-sm text-white transition disabled:cursor-wait disabled:opacity-60 ${
          pinned
            ? "bg-amber-600 hover:bg-amber-500"
            : "bg-slate-700 hover:bg-slate-600"
        }`}
      >
        {isPending ? "Saving…" : pinned ? "Unpin" : "Pin"}
      </button>
      {error && <p role="alert" className="mt-2 text-xs text-red-400">{error}</p>}
    </div>
  );
}
