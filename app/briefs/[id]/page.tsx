import BriefMetadata from "@/components/briefs/BriefMetadata";
import BriefSection from "@/components/briefs/BriefSection";
import PriorityBadge from "@/components/dashboard/PriorityBadge";
import { findRelatedBriefs, formatBriefDate, getBriefAiMetadata, isMeetingBrief, type BriefDetail, type RelatedBrief } from "@/lib/executive-brief-detail";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import Link from "next/link";
import { notFound } from "next/navigation";

export default async function BriefPage(props: PageProps<"/briefs/[id]">) {
  const { id } = await props.params;
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY!,
  );
  const { data, error } = await supabase.from("executive_briefs").select("*").eq("id", id).maybeSingle();

  if (error) throw new Error(`Unable to load executive brief: ${error.message}`);
  if (!data) notFound();

  const brief = data as BriefDetail;
  const ai = getBriefAiMetadata(brief.raw_ai_output);
  const related = await loadRelatedBriefs(supabase, brief);
  const meeting = isMeetingBrief(brief);

  return (
    <main className="min-h-screen bg-slate-950 px-5 py-8 text-white sm:px-8 lg:px-12">
      <div className="mx-auto max-w-7xl">
        <Link href="/" className="text-sm font-semibold text-blue-400 hover:text-blue-300">← Back to dashboard</Link>

        <header className="mt-8 border-b border-slate-800 pb-8">
          <div className="flex flex-wrap items-center gap-3">
            <PriorityBadge priority={brief.priority ?? "Low"} />
            <span className="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-300">
              {brief.category || (meeting ? "Meeting" : "Email")}
            </span>
            <span className="text-sm text-slate-500">{formatBriefDate(brief.received_at)}</span>
          </div>
          <h1 className="mt-5 max-w-5xl text-3xl font-bold tracking-tight sm:text-4xl">
            {brief.subject || (meeting ? "Untitled meeting" : "No subject")}
          </h1>
          {brief.client && <p className="mt-3 text-slate-400">{brief.client}</p>}
          {brief.web_link && (
            <a href={brief.web_link} target="_blank" rel="noreferrer" className="mt-5 inline-flex rounded-lg border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-200 hover:border-blue-500 hover:text-white">
              Open original
            </a>
          )}
        </header>

        <div className="mt-8 grid gap-8 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-6">
            <BriefSection title="Executive summary" content={brief.executive_summary} emptyLabel="This item has not been summarized yet." />
            <BriefSection title={meeting ? "Meeting description" : "Original email"} content={brief.body_text} emptyLabel={meeting ? "No meeting description was captured." : "No email body was captured."} />
            <div className="grid gap-6 lg:grid-cols-2">
              <BriefSection title="Action items" content={brief.action_items} />
              <BriefSection title="Decisions required" content={brief.decisions_required} />
              <BriefSection title="Risks" content={brief.risks} />
              <BriefSection title="Suggested reply" content={brief.suggested_reply} />
            </div>
            <BriefSection title="AI reasoning" content={ai.urgencyReason ?? ai.suppressionReason} emptyLabel="No AI reasoning was recorded for this item." />
            <IntelligenceEntities ai={ai} />
            <RelatedItems items={related} />
          </div>
          <BriefMetadata brief={brief} ai={ai} />
        </div>
      </div>
    </main>
  );
}

async function loadRelatedBriefs(supabase: SupabaseClient, brief: BriefDetail) {
  const { data, error } = await supabase
    .from("executive_briefs")
    .select("id, subject, sender, recipients, priority, received_at, source_type, source_account, client, raw_ai_output")
    .neq("id", brief.id)
    .order("received_at", { ascending: false })
    .limit(250);

  if (error) {
    console.error("Unable to load related intelligence candidates:", error.message);
    return [];
  }

  return findRelatedBriefs(brief, (data ?? []) as BriefDetail[]);
}

function IntelligenceEntities({ ai }: { ai: ReturnType<typeof getBriefAiMetadata> }) {
  const groups = [["People", ai.people], ["Organizations", ai.organizations], ["Projects", ai.projects]] as const;
  const hasEntities = groups.some(([, values]) => values.length > 0);

  return (
    <section className="rounded-xl border border-slate-800 bg-slate-900 p-6">
      <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-400">Intelligence context</h2>
      {!hasEntities ? (
        <p className="mt-4 text-sm text-slate-400">No people, organizations, or projects were identified.</p>
      ) : (
        <div className="mt-5 grid gap-5 sm:grid-cols-3">
          {groups.map(([label, values]) => values.length > 0 && (
            <div key={label}>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</h3>
              <div className="mt-2 flex flex-wrap gap-2">
                {values.map((value) => <span key={value} className="rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-200">{value}</span>)}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function RelatedItems({ items }: { items: RelatedBrief[] }) {
  return (
    <section className="rounded-xl border border-slate-800 bg-slate-900 p-6">
      <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-400">Related intelligence</h2>
      {items.length === 0 ? (
        <p className="mt-4 text-sm text-slate-400">No strong relationships were found in the synchronized briefs.</p>
      ) : (
        <div className="mt-4 divide-y divide-slate-800">
          {items.map((item) => (
            <Link key={item.id} href={`/briefs/${item.id}`} className="block py-4 hover:text-blue-300">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-medium">{item.subject || "Untitled item"}</p>
                  <p className="mt-1 text-xs text-slate-500">{formatBriefDate(item.received_at)}</p>
                </div>
                <span className="shrink-0 text-xs text-slate-500">{item.source_type === "calendar" ? "Meeting" : item.priority || "Brief"}</span>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {item.reasons.map((reason) => (
                  <span key={reason} className="rounded-full bg-slate-800 px-2.5 py-1 text-xs text-slate-300">
                    {reason}
                  </span>
                ))}
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
