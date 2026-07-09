import AppLayout from "@/components/layout/AppLayout";
import DashboardCard from "@/components/dashboard/DashboardCard";
import { createClient } from "@supabase/supabase-js";
import { ExecutiveEmail } from "@/types/email";

export default async function Home() {
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
      <div className="grid grid-cols-4 gap-6 mb-8">
        <MetricCard title="Critical" value={countPriority(emails, "Critical")} color="text-red-400" />
        <MetricCard title="High Priority" value={countPriority(emails, "High")} color="text-orange-400" />
        <MetricCard title="Open Decisions" value={emails.filter((e) => e.actionRequired).length} color="text-blue-400" />
        <MetricCard title="Total Briefs" value={emails.length} color="text-green-400" />
      </div>

      <h2 className="text-3xl font-bold text-white mb-6">Executive Inbox</h2>

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