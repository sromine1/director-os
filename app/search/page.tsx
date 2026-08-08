import DashboardRealtimeRefresh from "@/components/dashboard/DashboardRealtimeRefresh";
import AppLayout from "@/components/layout/AppLayout";
import {
  searchExecutiveBriefs,
  type SearchBriefRow,
} from "@/lib/executive-search";
import { formatBriefDate } from "@/lib/executive-brief-detail";
import { createClient } from "@supabase/supabase-js";
import Link from "next/link";

type SearchPageProps = {
  searchParams: Promise<{ q?: string }>;
};

const EXAMPLES = [
  "Show open risks",
  "Which meetings mention PowerCo?",
  "Show everything Boris sent this month",
  "What decisions are waiting on me?",
];

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const { q = "" } = await searchParams;
  const query = q.trim().slice(0, 300);
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY!,
  );

  let errorMessage: string | null = null;
  let results: ReturnType<typeof searchExecutiveBriefs> = [];

  if (query) {
    const { data, error } = await supabase
      .from("executive_briefs")
      .select(
        "id, subject, sender, recipients, client, category, priority, executive_summary, body_text, action_items, decisions_required, risks, received_at, completed_at, source_type, source_provider, raw_ai_output",
      )
      .order("received_at", { ascending: false })
      .limit(750);

    if (error) errorMessage = error.message;
    else results = searchExecutiveBriefs((data ?? []) as SearchBriefRow[], query);
  }

  return (
    <AppLayout>
      <DashboardRealtimeRefresh />
      <header className="mb-8">
        <p className="text-sm font-semibold uppercase tracking-wider text-blue-400">
          Unified context
        </p>
        <h1 className="mt-2 text-3xl font-bold text-white">Executive Search</h1>
        <p className="mt-2 max-w-3xl text-slate-400">
          Ask for people, meetings, topics, risks, decisions, actions, dates, or priorities.
        </p>
      </header>

      <form action="/search" method="get" className="rounded-xl border border-slate-700 bg-slate-800 p-4 sm:p-5">
        <label htmlFor="executive-search" className="sr-only">Search executive intelligence</label>
        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            id="executive-search"
            name="q"
            type="search"
            defaultValue={query}
            maxLength={300}
            placeholder="Show open risks about PowerCo"
            className="min-w-0 flex-1 rounded-lg border border-slate-600 bg-slate-950 px-4 py-3 text-white outline-none placeholder:text-slate-500 focus:border-blue-500"
          />
          <button type="submit" className="rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white transition hover:bg-blue-500">
            Search
          </button>
        </div>
      </form>

      {!query && (
        <section className="mt-8">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400">Try asking</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {EXAMPLES.map((example) => (
              <Link key={example} href={`/search?q=${encodeURIComponent(example)}`} className="rounded-full border border-slate-700 bg-slate-800 px-4 py-2 text-sm text-slate-300 hover:border-blue-500 hover:text-white">
                {example}
              </Link>
            ))}
          </div>
        </section>
      )}

      {errorMessage && (
        <p role="alert" className="mt-8 rounded-xl border border-red-700 bg-red-950 p-5 text-red-200">
          Unable to search briefs: {errorMessage}
        </p>
      )}

      {query && !errorMessage && (
        <section className="mt-8">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-2xl font-bold text-white">Search results</h2>
              <p className="mt-1 text-sm text-slate-400">
                {results.length} result{results.length === 1 ? "" : "s"} for “{query}”
              </p>
            </div>
          </div>

          {results.length === 0 ? (
            <div className="mt-5 rounded-xl border border-slate-700 bg-slate-800 p-6 text-slate-300">
              No synchronized briefs matched that request. Try fewer words or a broader date range.
            </div>
          ) : (
            <div className="mt-5 space-y-4">
              {results.map(({ brief, matches, snippet }) => (
                <Link key={brief.id} href={`/briefs/${brief.id}`} className="block rounded-xl border border-slate-700 bg-slate-800 p-5 transition hover:border-blue-500">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs text-slate-500">{formatBriefDate(brief.received_at)}</p>
                      <h3 className="mt-1 text-lg font-bold text-white">{brief.subject || "Untitled brief"}</h3>
                      {brief.sender && <p className="mt-1 text-sm text-slate-400">{brief.sender}</p>}
                    </div>
                    <span className="text-xs font-semibold text-slate-400">{brief.source_type === "calendar" ? "Meeting" : brief.priority || "Brief"}</span>
                  </div>
                  <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-slate-300">{snippet}</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {matches.map((match) => (
                      <span key={match} className="rounded-full bg-slate-900 px-2.5 py-1 text-xs text-slate-300">{match}</span>
                    ))}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      )}
    </AppLayout>
  );
}
