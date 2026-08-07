import AppLayout from "@/components/layout/AppLayout";
import DashboardRealtimeRefresh from "@/components/dashboard/DashboardRealtimeRefresh";
import TimelineItemCard from "@/components/timeline/TimelineItemCard";
import {
  buildExecutiveTimeline,
  type TimelineBriefRow,
  type TimelineItem,
} from "@/lib/executive-timeline";
import { createClient } from "@supabase/supabase-js";
import Link from "next/link";

type TimelinePageProps = {
  searchParams: Promise<{ range?: string }>;
};

type TimelineRange = "today" | "week" | "all";

const USER_TIME_ZONE = "America/Detroit";

export default async function TimelinePage({ searchParams }: TimelinePageProps) {
  const params = await searchParams;
  const range = normalizeRange(params.range);
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY!,
  );
  const { data, error } = await supabase
    .from("executive_briefs")
    .select(
      "id, source_message_id, source_provider, source_account, source_type, subject, sender, priority, executive_summary, action_items, decisions_required, deadline, received_at, completed_at",
    )
    .not("source_message_id", "is", null)
    .order("received_at", { ascending: true })
    .limit(1000);

  const timeline = error
    ? []
    : filterTimeline(buildExecutiveTimeline((data ?? []) as TimelineBriefRow[]), range);
  const groups = groupByDay(timeline);

  return (
    <AppLayout>
      <DashboardRealtimeRefresh />
      <header className="mb-8">
        <p className="text-sm font-semibold uppercase tracking-wider text-blue-400">
          Unified context
        </p>
        <h1 className="mt-2 text-3xl font-bold text-white">Executive Timeline</h1>
        <p className="mt-2 max-w-3xl text-slate-400">
          Emails, meetings, action items, and deadlines in one chronological view.
        </p>
      </header>

      <nav aria-label="Timeline range" className="mb-8 flex flex-wrap gap-2">
        <RangeLink href="/timeline?range=today" active={range === "today"}>Today</RangeLink>
        <RangeLink href="/timeline?range=week" active={range === "week"}>Next 7 days</RangeLink>
        <RangeLink href="/timeline?range=all" active={range === "all"}>All synced</RangeLink>
      </nav>

      {error ? (
        <div className="rounded-xl border border-red-700 bg-red-950 p-5 text-red-200">
          Unable to load the timeline: {error.message}
        </div>
      ) : groups.length === 0 ? (
        <div className="rounded-xl border border-slate-700 bg-slate-800 p-6 text-slate-300">
          No timeline items fall within this range.
        </div>
      ) : (
        <div className="space-y-10">
          {groups.map(([day, items]) => (
            <section key={day}>
              <h2 className="mb-4 text-xl font-bold text-white">{formatDay(day)}</h2>
              <div>
                {items.map((item) => <TimelineItemCard key={item.id} item={item} />)}
              </div>
            </section>
          ))}
        </div>
      )}
    </AppLayout>
  );
}

function filterTimeline(items: TimelineItem[], range: TimelineRange) {
  if (range === "all") return items;
  const now = new Date();
  const start = startOfDay(now);
  const end = new Date(start);
  end.setDate(end.getDate() + (range === "today" ? 1 : 7));
  return items.filter((item) => {
    const timestamp = new Date(item.occurredAt);
    return timestamp >= start && timestamp < end;
  });
}

function groupByDay(items: TimelineItem[]) {
  const groups = new Map<string, TimelineItem[]>();
  for (const item of items) {
    const key = dayKey(item.occurredAt);
    groups.set(key, [...(groups.get(key) ?? []), item]);
  }
  return [...groups.entries()].sort(([a], [b]) => b.localeCompare(a));
}

function dayKey(value: string) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: USER_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));
}

function formatDay(day: string) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date(`${day}T12:00:00Z`));
}

function startOfDay(value: Date) {
  const day = dayKey(value.toISOString());
  return new Date(`${day}T00:00:00-04:00`);
}

function normalizeRange(value?: string): TimelineRange {
  return value === "today" || value === "week" ? value : "all";
}

function RangeLink({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`rounded-lg border px-4 py-2 text-sm font-semibold transition ${
        active
          ? "border-blue-500 bg-blue-950 text-blue-200"
          : "border-slate-600 text-slate-300 hover:border-blue-500 hover:text-white"
      }`}
    >
      {children}
    </Link>
  );
}
