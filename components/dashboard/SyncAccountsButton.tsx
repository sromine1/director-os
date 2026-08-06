"use client";

import { syncAllConnectedAccounts } from "@/app/actions/sync";
import { useState, useTransition } from "react";

export default function SyncAccountsButton() {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  return (
    <div className="flex min-w-0 flex-col gap-2">
      <button
        type="button"
        disabled={isPending}
        onClick={() => {
          setResult(null);
          startTransition(async () => setResult(await syncAllConnectedAccounts()));
        }}
        className="rounded-lg border border-slate-500 px-5 py-3 text-center font-semibold text-white hover:bg-slate-700 disabled:cursor-wait disabled:opacity-60"
      >
        {isPending ? "Syncing accounts…" : "Sync all accounts"}
      </button>
      {result && (
        <p
          role="status"
          className={`max-w-sm text-xs ${result.success ? "text-green-300" : "text-red-300"}`}
        >
          {result.message}
        </p>
      )}
    </div>
  );
}
