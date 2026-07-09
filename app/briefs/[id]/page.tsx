import { createClient } from "@supabase/supabase-js";
import Link from "next/link";

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function BriefPage({ params }: PageProps) {
  const { id } = await params;

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!
  );

  const { data: brief } = await supabase
    .from("executive_briefs")
    .select("*")
    .eq("id", id)
    .single();

  if (!brief) {
    return (
      <div className="p-12 text-white">
        Brief not found.
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white p-10">
      <Link
        href="/"
        className="text-blue-400 hover:underline"
      >
        ← Back to Dashboard
      </Link>

      <div className="mt-8 max-w-5xl">

        <div className="flex items-center gap-4">

          <span className="rounded-full bg-red-600 px-4 py-1 font-semibold">
            {brief.priority}
          </span>

          <span className="text-slate-400">
            {brief.client}
          </span>

          <span className="text-slate-500">
            {brief.category}
          </span>

        </div>

        <h1 className="text-5xl font-bold mt-6">
          {brief.subject}
        </h1>

        <div className="mt-10 rounded-xl bg-slate-900 p-8">

          <h2 className="text-2xl font-semibold mb-4">
            Executive Summary
          </h2>

          <p className="text-slate-300 whitespace-pre-wrap">
            {brief.executive_summary}
          </p>

        </div>

        <div className="grid grid-cols-2 gap-6 mt-8">

          <Section
            title="Action Items"
            content={brief.action_items}
          />

          <Section
            title="Decisions Required"
            content={brief.decisions_required}
          />

          <Section
            title="Risks"
            content={brief.risks}
          />

          <Section
            title="Suggested Reply"
            content={brief.suggested_reply}
          />

        </div>

      </div>
    </main>
  );
}

function Section({
  title,
  content,
}: {
  title: string;
  content: string | null;
}) {
  return (
    <div className="rounded-xl bg-slate-900 p-6">
      <h3 className="text-xl font-semibold mb-3">
        {title}
      </h3>

      <div className="whitespace-pre-wrap text-slate-300">
        {content || "None"}
      </div>
    </div>
  );
}