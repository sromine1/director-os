import AppLayout from "@/components/layout/AppLayout";
import DashboardCard from "@/components/dashboard/DashboardCard";
import { createClient } from "@supabase/supabase-js";
import { ExecutiveEmail } from "@/types/email";

type HomeProps = {
  searchParams: Promise<{
    nylas?: string;
    email?: string;
    provider?: string;
    message?: string;
  }>;
};

export default async function Home({ searchParams }: HomeProps) {
  const params = await searchParams;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY!;

  const supabase = createClient(supabaseUrl, supabaseSecretKey);

  const { data, error } = await supabase
    .from("executive_briefs")
    .select("*")
    .order("received_at", { ascending: false })
    .limit(20);

  const emails: ExecutiveEmail[] =
    data?.map((row) => ({
      id: row.id,
      subject: row.subject ?? "No subject",
      sender: row.sender ?? "Unknown",
      priority: normalizePriority(row.priority),
      category: row.category ?? "Unclassified",
      summary: row.executive_summary ?? "No summary available.",
      actionRequired: Boolean(row.action_items || row.decisions_required),
      deadline: row.deadline ?? undefined,
    })) ?? [];

  return (
    <AppLayout>
      <section className="mb-8 rounded-xl border border-slate-700 bg-slate-800 p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-blue-400">
              Email connections
            </p>
            <h1 className="mt-2 text-2xl font-bold text-white">
              Connect an inbox to DirectorOS
            </h1>
            <p className="mt-2 max-w-2xl text-slate-300">
              Connect Gmail or Outlook through Nylas. DirectorOS will use the connection to retrieve messages and build your executive inbox.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <a
              href="/api/auth/nylas/connect?provider=google"
              className="rounded-lg bg-white px-5 py-3 text-center font-semibold text-slate-900 transition hover:bg-slate-200"
            >
              Connect Gmail
            </a>
            <a
              href="/api/auth/nylas/connect?provider=microsoft"
              className="rounded-lg bg-blue-600 px-5 py-3 text-center font-semibold text-white transition hover:bg-blue-500"
            >
              Connect Outlook
            </a>
          </div>
        </div>
      </section>

      {params.nylas === "connected" && (
        <div className="mb-8 rounded-xl border border-green-700 bg-green-950 p-4 text-green-200">
          Email connected successfully
          {params.email ? `: ${params.email}` : ""}.
        </div>
      )}

      {params.nylas === "error" && (
        <div className="mb-8 rounded-xl border border-red-700 bg-red-950 p-4 text-red-200">
          Email connection failed: {params.message ?? "Unknown Nylas OAuth error."}
        </div>
      )}

      <div className="mb-8 grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard title="Critical" value={countPriority(emails, "Critical")} color="text-red-400" />
        <MetricCard title="High Priority" value={countPriority(emails, "High")} color="text-orange-400" />
        <MetricCard title="Open Decisions" value={emails.filter((e) => e.actionRequired).length} color="text-blue-400" />
        <MetricCard title="Total Briefs" value={emails.length} color="text-green-400" />
      </div>

      <h2 className="mb-6 text-3xl font-bold text-white">Executive Inbox</h2>

      {error && (
        <div className="rounded-xl bg-red-950 border border-red-700 p-4 text-red-200">
          Error loading executive briefs: {error.message}
        </div>
      )}

      {!error && emails.length === 0 && (
        <div className="rounded-xl bg-slate-800 border border-slate-700 p-6 text-slate-300">
          No executive briefs yet.
        </div>
      )}

      <div className="space-y-5">
        {emails.map((email) => (
          <DashboardCard key={email.id} email={email} />
        ))}
      </div>
    </AppLayout>
  );
}

function MetricCard({
  title,
  value,
  color,
}: {
  title: string;
  value: number;
  color: string;
}) {
  return (
    <div className="rounded-xl bg-slate-800 border border-slate-700 p-6">
      <p className="text-slate-400">{title}</p>
      <p className={`text-4xl font-bold mt-3 ${color}`}>{value}</p>
    </div>
  );
}

function countPriority(emails: ExecutiveEmail[], priority: string) {
  return emails.filter((email) => email.priority === priority).length;
}

function normalizePriority(priority: string | null): ExecutiveEmail["priority"] {
  if (priority === "Critical" || priority === "High" || priority === "Medium" || priority === "Low") {
    return priority;
  }

  return "Low";
}
