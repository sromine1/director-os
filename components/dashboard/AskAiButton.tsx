"use client";

import { askBriefAi } from "@/app/actions/ask-ai";
import type { BriefChatMessage } from "@/lib/ai/brief-chat";
import { FormEvent, useState, useTransition } from "react";

const SUGGESTIONS = [
  "Summarize this for the CEO",
  "Explain the key risks",
  "What decision is required?",
  "Suggest questions I should ask",
];

export default function AskAiButton({ briefId }: { briefId: string }) {
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [history, setHistory] = useState<BriefChatMessage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function submit(event?: FormEvent, suggestedQuestion?: string) {
    event?.preventDefault();
    const nextQuestion = (suggestedQuestion ?? question).trim();
    if (!nextQuestion || isPending) return;

    setQuestion("");
    setError(null);
    startTransition(async () => {
      try {
        const boundedHistory = history.slice(-8).map((message) => ({
          ...message,
          content: message.content.slice(0, 4_000),
        }));
        const result = await askBriefAi(briefId, nextQuestion, boundedHistory);
        if (result.success) {
          setHistory((current) => [
            ...current,
            { role: "user", content: nextQuestion },
            { role: "assistant", content: result.answer },
          ]);
        } else {
          setError(result.message);
          setQuestion(nextQuestion);
        }
      } catch {
        setError("The AI request failed before completion. Please try again.");
        setQuestion(nextQuestion);
      }
    });
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="rounded-md bg-blue-600 px-3 py-1 text-sm text-white transition hover:bg-blue-500">
        Ask AI
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4" role="dialog" aria-modal="true" aria-labelledby={`ask-ai-title-${briefId}`}>
          <div className="flex max-h-[85vh] w-full max-w-2xl flex-col rounded-xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id={`ask-ai-title-${briefId}`} className="text-xl font-bold text-white">Ask DirectorOS</h2>
                <p className="mt-1 text-sm text-slate-400">Answers are grounded in this Executive Brief.</p>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="text-2xl leading-none text-slate-400 hover:text-white" aria-label="Close Ask AI">×</button>
            </div>

            <div className="mt-5 flex-1 space-y-4 overflow-y-auto pr-1">
              {history.length === 0 ? (
                <div className="grid gap-2 sm:grid-cols-2">
                  {SUGGESTIONS.map((suggestion) => (
                    <button key={suggestion} type="button" onClick={() => submit(undefined, suggestion)} className="rounded-lg border border-slate-700 p-3 text-left text-sm text-slate-200 hover:border-blue-500 hover:bg-slate-800">
                      {suggestion}
                    </button>
                  ))}
                </div>
              ) : (
                history.map((message, index) => (
                  <div key={`${message.role}-${index}`} className={`rounded-lg p-4 text-sm leading-6 ${message.role === "user" ? "ml-10 bg-blue-950 text-blue-100" : "mr-10 bg-slate-800 text-slate-100"}`}>
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">{message.role === "user" ? "You" : "DirectorOS"}</p>
                    <p className="whitespace-pre-wrap">{message.content}</p>
                  </div>
                ))
              )}
              {isPending && <p className="text-sm text-blue-300">DirectorOS is analyzing the brief…</p>}
            </div>

            {error && <p role="alert" className="mt-3 text-sm text-red-400">{error}</p>}
            <form onSubmit={submit} className="mt-5 flex gap-3 border-t border-slate-700 pt-4">
              <input value={question} onChange={(event) => setQuestion(event.target.value)} maxLength={2000} placeholder="Ask about risks, decisions, impact, or next steps…" className="min-w-0 flex-1 rounded-lg border border-slate-700 bg-slate-950 px-4 py-2 text-sm text-white outline-none focus:border-blue-500" />
              <button type="submit" disabled={isPending || !question.trim()} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50">Send</button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
