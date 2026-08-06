import AppLayout from "@/components/layout/AppLayout";
import DashboardCard from "@/components/dashboard/DashboardCard";
import SyncAccountsButton from "@/components/dashboard/SyncAccountsButton";
import DashboardRealtimeRefresh from "@/components/dashboard/DashboardRealtimeRefresh";
import {
  connectedProviderName,
  getConnectedAccounts,
} from "@/lib/connectors/connected-accounts";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import Link from "next/link";
import { ExecutiveEmail } from "@/types/email";

type HomeProps = {
  searchParams: Promise<{
    nylas?: string;
    email?: string;
    provider?: string;
    message?: string;
    view?: string;
  }>;
};

type BriefRow = {
  id: string;
  source_message_id: string | null;
  source_provider: string | null;
  source_account: string | null;
  source_type: string | null;
  source_grant_id: string | null;
  subject: string | null;
  sender: string | null;
  recipients: string | null;
  priority: string | null;
  category: string | null;
  completed_at: string | null;
  snooze_until: string | null;
  pinned: boolean;
  web_link: string | null;
  executive_summary: string | null;
  body_text: string | null;
  action_items: string | null;
  decisions_required: string | null;
  deadline: string | null;
  received_at: string | null;
  raw_ai_output: unknown | null;
};

type AiMetadata = {
  importance_score?: number;
  should_display?: boolean;
  source_provider?: string;
  source_account?: string | null;
  source_type?: string;
};

type MeetingBrief = {
  id: string;
  title: string;
  organizer: string;
  attendees: string | null;
  startsAt: string;
  sourceLabel: string;
  sourceAccount?: string;
};

const DISPLAY_BRIEF_LIMIT = 50;
const USER_TIME_ZONE = "America/Detroit";

export default async function Home({ searchParams }: HomeProps) {
  const params = await searchParams;
  const showingCompleted = params.view === "completed";
  const showingSnoozed = params.view === "snoozed";
  const cookieStore = await cookies();
  const accounts = getConnectedAccounts(cookieStore);
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseSecretKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY!;
  const supabase = createClient(supabaseUrl, supabaseSecretKey);

  let briefs: ExecutiveEmail[] = [];
  let todayMeetings: MeetingBrief[] = [];
  let dashboardError: string | null = null;
  let statusCounts = { open: 0, snoozed: 0, completed: 0 };

  const { data, error } = await supabase
    .from("executive_briefs")
    .select("*")
    .not("source_message_id", "is", null)
    .order("received_at", { ascending: false })
    .limit(200);

  if (error) {
    dashboardError = error.message;
  } else {
    const now = getCurrentTimestamp();
    const relevantRows = ((data ?? []) as BriefRow[]).filter(shouldShowBrief);
    statusCounts = relevantRows.reduce(
      (counts, row) => {
        if (row.completed_at) counts.completed += 1;
        else if (dateValue(row.snooze_until) > now) counts.snoozed += 1;
        else counts.open += 1;
        return counts;
      },
      { open: 0, snoozed: 0, completed: 0 },
    );
    const rows = relevantRows.filter((row) => {
      if (showingCompleted) return Boolean(row.completed_at);
      if (row.completed_at) return false;
      const snoozeTime = dateValue(row.snooze_until);
      return showingSnoozed ? snoozeTime > now : snoozeTime <= now;
    });

    todayMeetings = rows
      .filter(
        (row) =>
          isCalendarRow(row) &&
          row.received_at &&
          isTodayInUserTimeZone(row.received_at),
      )
      .sort((a, b) => dateValue(a.received_at) - dateValue(b.received_at))
      .map((row) => ({
        id: row.id,
        title: row.subject ?? "Untitled meeting",
        organizer: row.sender ?? "Unknown organizer",
        attendees: row.recipients,
        startsAt: row.received_at as string,
        sourceLabel: sourceLabel(row.source_provider, true),
        sourceAccount: row.source_account ?? undefined,
      }));

    briefs = rows
      .sort(compareExecutivePriority)
      .slice(0, DISPLAY_BRIEF_LIMIT)
      .map(mapBriefRow);
  }

  return (
    <AppLayout>
      <DashboardRealtimeRefresh />
      <section className="mb-8 rounded-xl border border-slate-700 bg-slate-800 p-6">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
          <div className="min-w-0">
            <p className="text-sm font-semibold uppercase tracking-wider text-blue-400">
              Connected work accounts
            </p>
            <h1 className="mt-2 text-2xl font-bold text-white">
              {accounts.length > 0
                ? `${accounts.length} account${accounts.length === 1 ? "" : "s"} connected`
                : "Connect email and calendar"}
            </h1>
            {accounts.length > 0 ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {accounts.map((account) => (
                  <span
                    key={`${account.provider}:${account.grantId}`}
                    className="rounded-full border border-slate-600 bg-slate-900 px-3 py-1 text-sm text-slate-200"
                  >
                    {connectedProviderName(account.provider)}
                    {account.email ? ` · ${account.email}` : ""}
                  </span>
                ))}
              </div>
            ) : (
              <p className="mt-2 text-slate-300">
                Connect Gmail or Outlook through Nylas.
              </p>
            )}
          </div>
          <div className="grid w-full gap-3 sm:grid-cols-2 xl:w-auto xl:grid-cols-3">
            {accounts.length > 0 && (
              <SyncAccountsButton />
            )}
            <a
              href="/api/auth/nylas/connect?provider=google"
              className="rounded-lg bg-white px-5 py-3 text-center font-semibold text-slate-900 hover:bg-slate-200"
            >
              {accounts.some((account) => account.provider === "google")
                ? "Reconnect Google"
                : "Connect Google"}
            </a>
            <a
              href="/api/auth/nylas/connect?provider=microsoft"
              className="rounded-lg bg-blue-600 px-5 py-3 text-center font-semibold text-white hover:bg-blue-500"
            >
              {accounts.some((account) => account.provider === "microsoft")
                ? "Reconnect Outlook"
                : "Connect Outlook"}
            </a>
          </div>
        </div>
      </section>

      {params.nylas === "connected" && (
        <div className="mb-8 rounded-xl border border-green-700 bg-green-950 p-4 text-green-200">
          Account connected successfully
          {params.email ? `: ${params.email}` : ""}.
        </div>
      )}
      {(params.nylas === "error" || dashboardError) && (
        <div className="mb-8 rounded-xl border border-red-700 bg-red-950 p-4 text-red-200">
          {dashboardError ?? params.message ?? "Unknown connection error."}
        </div>
      )}

      <nav
        aria-label="Brief queue"
        className="mb-8 flex flex-wrap gap-2 rounded-xl border border-slate-700 bg-slate-800 p-3"
      >
        <StatusLink href="/" active={!showingCompleted && !showingSnoozed}>
          Open ({statusCounts.open})
        </StatusLink>
        <StatusLink href="/?view=snoozed" active={showingSnoozed}>
          Snoozed ({statusCounts.snoozed})
        </StatusLink>
        <StatusLink href="/?view=completed" active={showingCompleted}>
          Completed ({statusCounts.completed})
        </StatusLink>
      </nav>

      <div className="mb-8 grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Critical"
          value={countPriority(briefs, "Critical")}
          color="text-red-400"
        />
        <MetricCard
          title="High Priority"
          value={countPriority(briefs, "High")}
          color="text-orange-400"
        />
        <MetricCard
          title="Actions / Decisions"
          value={briefs.filter((brief) => brief.actionRequired).length}
          color="text-blue-400"
        />
        <MetricCard
          title="Today's Meetings"
          value={todayMeetings.length}
          color="text-green-400"
        />
      </div>

      <section className="mb-10">
        <h2 className="text-3xl font-bold text-white">Today&apos;s Meetings</h2>
        <p className="mb-5 mt-1 text-sm text-slate-400">
          Meetings scheduled for today in Eastern Time.
        </p>
        {todayMeetings.length === 0 ? (
          <div className="rounded-xl border border-slate-700 bg-slate-800 p-6 text-slate-300">
            No meetings are scheduled for today.
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
            {todayMeetings.map((meeting) => (
              <Link
                key={meeting.id}
                href={`/briefs/${meeting.id}`}
                className="rounded-xl border border-slate-700 bg-slate-800 p-5 transition hover:border-blue-500"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <span className="rounded-full border border-blue-700 bg-blue-950 px-3 py-1 text-sm font-semibold text-blue-200">
                      {meeting.sourceLabel}
                    </span>
                    {meeting.sourceAccount && (
                      <p className="mt-2 text-xs text-slate-400">
                        {meeting.sourceAccount}
                      </p>
                    )}
                  </div>
                  <time className="font-semibold text-white">
                    {formatMeetingTime(meeting.startsAt)}
                  </time>
                </div>
                <h3 className="mt-4 text-xl font-bold text-white">
                  {meeting.title}
                </h3>
                <p className="mt-2 text-sm text-slate-400">
                  Organizer: {meeting.organizer}
                </p>
              </Link>
            ))}
          </div>
        )}
      </section>

      <div className="mb-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold text-white">
              {showingCompleted
                ? "Completed Briefs"
                : showingSnoozed
                  ? "Snoozed Briefs"
                  : "Needs Your Attention"}
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              {showingCompleted
                ? "Completed items are retained for reference and can be restored."
                : showingSnoozed
                  ? "These briefs will return to the open queue automatically."
                  : "Low-value messages are stored but suppressed by the Executive Relevance Engine."}
            </p>
          </div>
        </div>
      </div>

      {!dashboardError && briefs.length === 0 && (
        <div className="rounded-xl border border-slate-700 bg-slate-800 p-6 text-slate-300">
          {showingCompleted
            ? "No completed Executive Briefs."
            : showingSnoozed
              ? "No Executive Briefs are currently snoozed."
              : "No relevant Executive Briefs are waiting for your attention."}
        </div>
      )}
      <div className="space-y-5">
        {briefs.map((brief) => (
          <DashboardCard key={brief.id} email={brief} />
        ))}
      </div>
    </AppLayout>
  );
}

function mapBriefRow(row: BriefRow): ExecutiveEmail {
  const metadata = getAiMetadata(row.raw_ai_output);
  const sourceType = row.source_type ?? metadata.source_type;
  const calendar = sourceType === "calendar" || isCalendarBrief(row.source_message_id);
  const provider = normalizeProvider(
    row.source_provider ?? metadata.source_provider,
  );

  return {
    id: row.id,
    subject: row.subject ?? "No subject",
    sender: row.sender ?? "Unknown",
    priority: normalizePriority(row.priority),
    category: row.category ?? (calendar ? "Calendar" : "Awaiting AI analysis"),
    summary: row.executive_summary ?? row.body_text ?? "No summary available.",
    actionRequired: Boolean(row.action_items || row.decisions_required),
    deadline: row.deadline ?? undefined,
    sourceProvider: provider,
    sourceAccount:
      row.source_account ?? metadata.source_account ?? undefined,
    sourceType: calendar ? "calendar" : "email",
    receivedAt: row.received_at ?? undefined,
    completedAt: row.completed_at ?? undefined,
    snoozeUntil: row.snooze_until ?? undefined,
    pinned: row.pinned,
    webLink: row.web_link ?? undefined,
    executiveScore:
      typeof metadata.importance_score === "number"
        ? metadata.importance_score
        : undefined,
  };
}

function shouldShowBrief(row: BriefRow) {
  if (isCalendarRow(row)) return true;
  const metadata = getAiMetadata(row.raw_ai_output);
  if (typeof metadata.should_display === "boolean") {
    return metadata.should_display;
  }
  return true;
}

function compareExecutivePriority(a: BriefRow, b: BriefRow) {
  const pinDifference = Number(b.pinned) - Number(a.pinned);
  if (pinDifference !== 0) return pinDifference;

  const scoreDifference =
    getImportanceScore(b.raw_ai_output) - getImportanceScore(a.raw_ai_output);
  if (scoreDifference !== 0) return scoreDifference;
  return (
    priorityWeight(b.priority) - priorityWeight(a.priority) ||
    dateValue(b.received_at) - dateValue(a.received_at)
  );
}

function getAiMetadata(rawAiOutput: unknown): AiMetadata {
  if (typeof rawAiOutput === "string") {
    try {
      return JSON.parse(rawAiOutput) as AiMetadata;
    } catch {
      return {};
    }
  }

  return rawAiOutput && typeof rawAiOutput === "object"
    ? (rawAiOutput as AiMetadata)
    : {};
}

function getImportanceScore(rawAiOutput: unknown) {
  const score = getAiMetadata(rawAiOutput).importance_score;
  return typeof score === "number" && Number.isFinite(score) ? score : -1;
}

function sourceLabel(providerValue: string | null | undefined, calendar: boolean) {
  const provider = normalizeProvider(providerValue);
  if (provider === "google") return calendar ? "Google Calendar" : "Gmail";
  if (provider === "microsoft") {
    return calendar ? "Outlook Calendar" : "Outlook";
  }
  return calendar ? "Calendar" : "Email";
}

function normalizeProvider(
  provider?: string | null,
): ExecutiveEmail["sourceProvider"] {
  const value = provider?.toLowerCase() ?? "unknown";
  if (value.includes("google")) return "google";
  if (value.includes("microsoft") || value.includes("outlook")) {
    return "microsoft";
  }
  return "unknown";
}

function priorityWeight(priority: string | null) {
  if (priority === "Critical") return 4;
  if (priority === "High") return 3;
  if (priority === "Medium") return 2;
  if (priority === "Low") return 1;
  return 0;
}

function dateValue(value: string | null) {
  if (!value) return 0;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function isCalendarBrief(sourceId: string | null | undefined) {
  return sourceId?.startsWith("calendar:") ?? false;
}

function isCalendarRow(row: BriefRow) {
  return row.source_type === "calendar" || isCalendarBrief(row.source_message_id);
}

function isTodayInUserTimeZone(value: string) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: USER_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(new Date(value)) === formatter.format(new Date());
}

function formatMeetingTime(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: USER_TIME_ZONE,
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
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

function countPriority(briefs: ExecutiveEmail[], priority: string) {
  return briefs.filter((brief) => brief.priority === priority).length;
}

function getCurrentTimestamp() {
  return Date.now();
}

function StatusLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`rounded-lg border px-4 py-2 text-sm font-semibold transition ${
        active
          ? "border-blue-500 bg-blue-950 text-blue-200"
          : "border-slate-600 text-slate-200 hover:border-blue-500 hover:text-white"
      }`}
    >
      {children}
    </Link>
  );
}

function normalizePriority(
  priority: string | null,
): ExecutiveEmail["priority"] {
  if (
    priority === "Critical" ||
    priority === "High" ||
    priority === "Medium" ||
    priority === "Low"
  ) {
    return priority;
  }
  return "Low";
}
