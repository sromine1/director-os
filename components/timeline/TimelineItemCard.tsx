import type { TimelineItem } from "@/lib/executive-timeline";
import Link from "next/link";

const KIND_STYLES: Record<TimelineItem["kind"], string> = {
  email: "border-blue-500 bg-blue-500",
  meeting: "border-violet-500 bg-violet-500",
  action: "border-amber-500 bg-amber-500",
  deadline: "border-red-500 bg-red-500",
};

export default function TimelineItemCard({ item }: { item: TimelineItem }) {
  return (
    <article className="relative grid grid-cols-[5rem_minmax(0,1fr)] gap-4 sm:grid-cols-[7rem_minmax(0,1fr)]">
      <time className="pt-5 text-right text-sm font-semibold text-slate-300">
        {formatTime(item.occurredAt)}
      </time>
      <div className="relative border-l border-slate-700 pb-5 pl-6">
        <span
          aria-hidden="true"
          className={`absolute -left-2 top-6 h-4 w-4 rounded-full border-4 ${KIND_STYLES[item.kind]}`}
        />
        <Link
          href={`/briefs/${item.briefId}`}
          className="block rounded-xl border border-slate-700 bg-slate-800 p-5 transition hover:border-blue-500"
        >
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-wide">
            <span className="rounded-full bg-slate-900 px-2.5 py-1 text-slate-200">
              {item.kind}
            </span>
            <span className="text-slate-400">{item.sourceLabel}</span>
            {item.completed && <span className="text-green-400">Completed</span>}
          </div>
          <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
            <h3 className="text-lg font-bold text-white">{item.title}</h3>
            <span className="text-sm font-semibold text-slate-300">{item.priority}</span>
          </div>
          <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-slate-300">
            {item.detail}
          </p>
          {(item.person || item.sourceAccount) && (
            <p className="mt-3 text-xs text-slate-500">
              {[item.person, item.sourceAccount].filter(Boolean).join(" · ")}
            </p>
          )}
        </Link>
      </div>
    </article>
  );
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Detroit",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}
