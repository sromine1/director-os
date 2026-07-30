import AppLayout from "@/components/layout/AppLayout";
import DashboardCard from "@/components/dashboard/DashboardCard";
import { listRecentMessages, NylasMessage } from "@/lib/connectors/email/nylas/messages";
import { syncNylasMessagesToSupabase } from "@/lib/connectors/email/sync";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { ExecutiveEmail } from "@/types/email";

type HomeProps = {
  searchParams: Promise<{
    nylas?: string;
    email?: string;
    provider?: string;
    message?: string;
  }>;
};

type BriefRow = {
  id: string;
  subject: string | null;
  sender: string | null;
  priority: string | null;
  category: string | null;
  executive_summary: string | null;
  body_text: string | null;
  action_items: string | null;
  decisions_required: string | null;
  deadline: string | null;
  received_at: string | null;
  raw_ai_output: unknown | null;
};

const SYNC_MESSAGE_LIMIT = 50;
const DISPLAY_MESSAGE_LIMIT = 50;

export default async function Home({ searchParams }: HomeProps) {
  const params = await searchParams;
  const cookieStore = await cookies();
  const grantId = cookieStore.get("nylas_grant_id")?.value;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseSecretKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY!;
  const supabase = createClient(supabaseUrl, supabaseSecretKey);

  let emails: ExecutiveEmail[] = [];
  let inboxError: string | null = null;
  let syncMessage: string | null = null;
  let liveMessages: NylasMessage[] = [];

  if (grantId) {
    try {
      liveMessages = await listRecentMessages(grantId, SYNC_MESSAGE_LIMIT);
      const result = await syncNylasMessagesToSupabase(supabase, liveMessages);
      syncMessage = `${result.inserted} new, ${result.updated} existing, and ${result.analyzed} AI-analyzed messages saved.`;
      if (result.analysisFailed > 0) {
        syncMessage += ` ${result.analysisFailed} AI analysis attempt(s) failed; check the server console.`;
      }
    } catch (error) {
      inboxError = error instanceof Error ? error.message : "Unable to synchronize inbox messages.";
    }
  }

  const { data, error } = await supabase
    .from("executive_briefs")
    .select("*")
    .order("received_at", { ascending: false })
    .limit(100);

  if (error) {
    inboxError = inboxError ?? error.message;
  } else {
    const prioritizedRows = ((data ?? []) as BriefRow[])
      .sort(compareExecutivePriority)
      .slice(0, DISPLAY_MESSAGE_LIMIT);

    emails = prioritizedRows.map((row) => ({
      id: row.id,
      subject: row.subject ?? "No subject",
      sender: row.sender ?? "Unknown",
      priority: normalizePriority(row.priority),
      category: row.category ?? "Awaiting AI analysis",
      summary: row.executive_summary ?? row.body_text ?? "No summary available.",
      actionRequired: Boolean(row.action_items || row.decisions_required),
      deadline: row.deadline ?? undefined,
    }));
  }

  if (emails.length === 0 && liveMessages.length > 0) {
    emails = liveMessages.map(mapNylasMessage).sort(compareExecutiveEmails);
  }

  return (
    <AppLayout>
      <section className="mb-8 rounded-xl border border-slate-700 bg-slate-800 p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-blue-400">
              Email connections
            </p>
            <h1 className="mt-2 text-2xl font-bold text-white">
              {grantId ? "Inbox connected to DirectorOS" : "Connect an inbox to DirectorOS"}
            </h1>
            <p className="mt-2 max-w-2xl text-slate-300">
              {grantId
                ? "DirectorOS retrieves recent messages through Nylas, stores them in Supabase, analyzes new emails, and ranks the executive inbox by importance."
                : "Connect Gmail or Outlook through Nylas. DirectorOS will retrieve, analyze, and prioritize messages for your executive inbox."}
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            {grantId && (
              <a
                href="/"
                className="rounded-lg border border-slate-500 px-5 py-3 text-center font-semibold text-white transition hover:bg-slate-700"
              >
                Sync and analyze
              </a>
            )}
            <a
              href="/api/auth/nylas/connect?provider=google"
              className="rounded-lg bg-white px-5 py-3 text-center font-semibold text-slate-900 transition hover:bg-slate-200"
            >
              {grantId ? "Reconnect Gmail" : "Connect Gmail"}
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
          Email connected successfully{params.email ? `: ${params.email}` : ""}.
        </div>
      )}

      {syncMessage && !inboxError && (
        <div className="mb-8 rounded-xl border border-green-700 bg-green-950 p-4 text-green-200">
          Inbox synchronized: {syncMessage}
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
        <MetricCard title="Open Decisions" value={emails.filter((email) => email.actionRequired).length} color="text-blue-400" />
        <MetricCard title="Prioritized Messages" value={emails.length} color="text-green-400" />
      </div>

      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-white">Executive Inbox</h2>
          <p className="mt-1 text-sm text-slate-400">
            Ranked by AI importance, priority, required action, deadline, and recency.
          </p>
        </div>
        {grantId && (
          <span className="rounded-full border border-green-700 bg-green-950 px-3 py-1 text-sm text-green-200">
            Nylas → OpenAI → Supabase
          </span>
        )}
      </div>

      {inboxError && (
        <div className="mb-5 rounded-xl border border-red-700 bg-red-950 p-4 text-red-200">
          Inbox synchronization warning: {inboxError}
        </div>
      )}

      {!inboxError && emails.length === 0 && (
        <div className="rounded-xl border border-slate-700 bg-slate-800 p-6 text-slate-300">
          No executive inbox messages have been saved yet.
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

function compareExecutivePriority(a: BriefRow, b: BriefRow) {
  const scoreDifference = getImportanceScore(b.raw_ai_output) - getImportanceScore(a.raw_ai_output);
  if (scoreDifference !== 0) return scoreDifference;

  const priorityDifference = priorityWeight(b.priority) - priorityWeight(a.priority);
  if (priorityDifference !== 0) return priorityDifference;

  const actionDifference = Number(Boolean(b.action_items || b.decisions_required)) - Number(Boolean(a.action_items || a.decisions_required));
  if (actionDifference !== 0) return actionDifference;

  const deadlineDifference = deadlineWeight(b.deadline) - deadlineWeight(a.deadline);
  if (deadlineDifference !== 0) return deadlineDifference;

  return dateValue(b.received_at) - dateValue(a.received_at);
}

function compareExecutiveEmails(a: ExecutiveEmail, b: ExecutiveEmail) {
  return priorityWeight(b.priority) - priorityWeight(a.priority);
}

function getImportanceScore(rawAiOutput: unknown) {
  if (!rawAiOutput || typeof rawAiOutput !== "object") return -1;
  const score = (rawAiOutput as { importance_score?: unknown }).importance_score;
  return typeof score === "number" && Number.isFinite(score) ? score : -1;
}

function priorityWeight(priority: string | null) {
  switch (priority) {
    case "Critical":
      return 4;
    case "High":
      return 3;
    case "Medium":
      return 2;
    case "Low":
      return 1;
    default:
      return 0;
  }
}

function deadlineWeight(deadline: string | null) {
  if (!deadline) return 0;
  const deadlineTime = Date.parse(deadline);
  if (Number.isNaN(deadlineTime)) return 1;

  const hoursRemaining = (deadlineTime - Date.now()) / 3_600_000;
  if (hoursRemaining < 0) return 4;
  if (hoursRemaining <= 24) return 3;
  if (hoursRemaining <= 72) return 2;
  return 1;
}

function dateValue(value: string | null) {
  if (!value) return 0;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function mapNylasMessage(message: NylasMessage): ExecutiveEmail {
  const sender = message.from?.[0];
  const senderLabel = sender?.name || sender?.email || "Unknown sender";

  return {
    id: message.id,
    subject: message.subject || "No subject",
    sender: senderLabel,
    priority: message.starred ? "High" : "Low",
    category: "Awaiting AI analysis",
    summary: message.snippet?.trim() || "Open this message to view its contents.",
    actionRequired: false,
  };
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
    <div className="rounded-xl border border-slate-700 bg-slate-800 p-6">
      <p className="text-slate-400">{title}</p>
      <p className={`mt-3 text-4xl font-bold ${color}`}>{value}</p>
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
