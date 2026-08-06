"use client";

import { setBriefCompleted } from "@/app/actions/briefs";
import type { ExecutiveEmail } from "@/types/email";
import Link from "next/link";
import { useState, useTransition } from "react";
import PriorityBadge from "./PriorityBadge";
import SnoozeButton from "./SnoozeButton";
import PinButton from "./PinButton";
import DraftReplyButton from "./DraftReplyButton";
import AskAiButton from "./AskAiButton";

type Props = {
  email: ExecutiveEmail;
};

export default function DashboardCard({ email }: Props) {
  const [isPending, startTransition] = useTransition();
  const [actionError, setActionError] = useState<string | null>(null);
  const isCalendar = email.sourceType === "calendar" || email.category === "Calendar";
  const sourceLabel = getSourceLabel(email.sourceProvider, isCalendar);
  const received = email.receivedAt && formatReceivedAt(email.receivedAt);

  function updateCompletion() {
    setActionError(null);
    startTransition(async () => {
      const result = await setBriefCompleted(email.id, !email.completedAt);
      if (!result.success) setActionError(result.message);
    });
  }

  return (
    <article className="rounded-lg border border-slate-700 bg-slate-800 p-5 shadow transition hover:border-blue-500">
      <Link href={`/briefs/${email.id}`} className="block">
        <div className="mb-3 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className="inline-flex rounded-full border border-slate-600 bg-slate-900 px-2.5 py-1 text-xs font-semibold text-slate-200">
                {sourceLabel}
              </span>
              {email.pinned && (
                <span className="inline-flex rounded-full border border-amber-700 bg-amber-950 px-2.5 py-1 text-xs font-semibold text-amber-200">
                  Pinned
                </span>
              )}
              {email.sourceAccount && <span className="text-xs text-slate-400">{email.sourceAccount}</span>}
              {received && <span className="text-xs text-slate-500">• {received}</span>}
              {typeof email.executiveScore === "number" && (
                <span className="text-xs text-slate-500">• Relevance {email.executiveScore}/100</span>
              )}
            </div>
            <h2 className="text-xl font-bold text-white">{email.subject}</h2>
          </div>
          <PriorityBadge priority={email.priority} />
        </div>

        <p className="text-sm text-slate-400">{email.sender}</p>
        <p className="mt-3 leading-relaxed text-slate-200">{email.summary}</p>
        {email.deadline && <p className="mt-4 font-semibold text-red-400">Deadline: {email.deadline}</p>}
        {email.snoozeUntil && (
          <p className="mt-4 text-sm font-semibold text-blue-300">
            Snoozed until {formatReceivedAt(email.snoozeUntil)}
          </p>
        )}
      </Link>

      <div className="mt-6 flex flex-wrap gap-2 border-t border-slate-700 pt-4">
        {email.webLink ? (
          <a
            href={email.webLink}
            target="_blank"
            rel="noreferrer"
            className="rounded-md bg-slate-700 px-3 py-1 text-sm text-white transition hover:bg-slate-600"
          >
            Open Original
          </a>
        ) : (
          <button
            type="button"
            disabled
            title="Sync this account to refresh the original item link."
            className="cursor-not-allowed rounded-md bg-slate-700 px-3 py-1 text-sm text-slate-400 opacity-70"
          >
            Original unavailable
          </button>
        )}
        <DraftReplyButton briefId={email.id} />
        <button
          type="button"
          disabled={isPending}
          onClick={updateCompletion}
          className="rounded-md bg-slate-700 px-3 py-1 text-sm text-white transition hover:bg-slate-600 disabled:cursor-wait disabled:opacity-60"
        >
          {isPending ? "Saving…" : email.completedAt ? "↩ Restore" : "✓ Complete"}
        </button>
        <SnoozeButton briefId={email.id} snoozeUntil={email.snoozeUntil} />
        <PinButton briefId={email.id} pinned={email.pinned} />
        <AskAiButton briefId={email.id} />
      </div>

      {actionError && <p role="alert" className="mt-3 text-sm text-red-400">Unable to update brief: {actionError}</p>}
    </article>
  );
}

function formatReceivedAt(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) return null;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function getSourceLabel(provider: ExecutiveEmail["sourceProvider"], isCalendar: boolean) {
  if (provider === "google") return isCalendar ? "Google Calendar" : "Gmail";
  if (provider === "microsoft") return isCalendar ? "Outlook Calendar" : "Outlook";
  return isCalendar ? "Calendar" : "Email";
}
