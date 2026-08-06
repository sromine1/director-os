"use client";

import { draftBriefReply } from "@/app/actions/replies";
import { useState, useTransition } from "react";

const TONES = ["concise", "professional", "executive", "friendly", "formal"] as const;

export default function DraftReplyButton({ briefId }: { briefId: string }) {
  const [open, setOpen] = useState(false);
  const [tone, setTone] = useState<(typeof TONES)[number]>("executive");
  const [draft, setDraft] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function generate() {
    setMessage(null);
    setError(null);
    startTransition(async () => {
      try {
        const result = await draftBriefReply(briefId, tone);
        if (result.success) setDraft(result.draft);
        else setError(result.message);
      } catch {
        setError("The reply request failed before completion. Please try again.");
      }
    });
  }

  async function copyDraft() {
    try {
      await navigator.clipboard.writeText(draft);
      setMessage("Copied to clipboard.");
    } catch {
      setMessage("Unable to access the clipboard. Select and copy the draft manually.");
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-md bg-slate-700 px-3 py-1 text-sm text-white transition hover:bg-slate-600"
      >
        Draft Reply
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4" role="dialog" aria-modal="true" aria-labelledby={`draft-title-${briefId}`}>
          <div className="w-full max-w-2xl rounded-xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id={`draft-title-${briefId}`} className="text-xl font-bold text-white">Draft executive reply</h2>
                <p className="mt-1 text-sm text-slate-400">Review and edit before using. Nothing is sent automatically.</p>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="text-2xl leading-none text-slate-400 hover:text-white" aria-label="Close draft reply">×</button>
            </div>

            <div className="mt-5 flex flex-wrap items-end gap-3">
              <label className="text-sm text-slate-300">
                Tone
                <select value={tone} onChange={(event) => setTone(event.target.value as (typeof TONES)[number])} className="mt-1 block rounded-md border border-slate-600 bg-slate-800 px-3 py-2 text-white">
                  {TONES.map((option) => <option key={option} value={option}>{capitalize(option)}</option>)}
                </select>
              </label>
              <button type="button" disabled={isPending} onClick={generate} className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:cursor-wait disabled:opacity-60">
                {isPending ? "Generating…" : draft ? "Regenerate" : "Generate draft"}
              </button>
            </div>

            <textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Choose a tone and generate a reply."
              className="mt-5 min-h-64 w-full resize-y rounded-lg border border-slate-700 bg-slate-950 p-4 text-sm leading-6 text-slate-100 outline-none focus:border-blue-500"
            />
            {error && <p role="alert" className="mt-3 text-sm text-red-400">{error}</p>}
            {message && <p role="status" className="mt-3 text-sm text-green-300">{message}</p>}
            <div className="mt-5 flex justify-end gap-3">
              <button type="button" onClick={() => setOpen(false)} className="rounded-md border border-slate-600 px-4 py-2 text-sm text-slate-200 hover:bg-slate-800">Close</button>
              <button type="button" disabled={!draft} onClick={copyDraft} className="rounded-md bg-white px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-50">Copy reply</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
