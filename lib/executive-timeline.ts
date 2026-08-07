export type TimelineBriefRow = {
  id: string;
  source_message_id: string | null;
  source_provider: string | null;
  source_account: string | null;
  source_type: string | null;
  subject: string | null;
  sender: string | null;
  priority: string | null;
  executive_summary: string | null;
  action_items: string | null;
  decisions_required: string | null;
  deadline: string | null;
  received_at: string | null;
  completed_at: string | null;
};

export type TimelineItemKind = "email" | "meeting" | "action" | "deadline";

export type TimelineItem = {
  id: string;
  briefId: string;
  kind: TimelineItemKind;
  occurredAt: string;
  title: string;
  detail: string;
  person?: string;
  priority: string;
  sourceLabel: string;
  sourceAccount?: string;
  completed: boolean;
};

export function buildExecutiveTimeline(rows: TimelineBriefRow[]) {
  return rows
    .flatMap(buildTimelineItems)
    .sort((a, b) => Date.parse(a.occurredAt) - Date.parse(b.occurredAt));
}

function buildTimelineItems(row: TimelineBriefRow): TimelineItem[] {
  const occurredAt = validDate(row.received_at);
  if (!occurredAt) return [];

  const meeting = isCalendarRow(row);
  const base: TimelineItem = {
    id: `${row.id}:${meeting ? "meeting" : "email"}`,
    briefId: row.id,
    kind: meeting ? "meeting" : "email",
    occurredAt,
    title: row.subject?.trim() || (meeting ? "Untitled meeting" : "No subject"),
    detail:
      row.executive_summary?.trim() ||
      (meeting ? "Calendar meeting" : "Email awaiting summary"),
    person: row.sender?.trim() || undefined,
    priority: row.priority?.trim() || "Low",
    sourceLabel: sourceLabel(row.source_provider, meeting),
    sourceAccount: row.source_account?.trim() || undefined,
    completed: Boolean(row.completed_at),
  };

  const items = [base];
  const deadline = validDate(row.deadline);

  if (row.action_items?.trim()) {
    items.push({
      ...base,
      id: `${row.id}:action`,
      kind: "action",
      occurredAt: deadline ?? occurredAt,
      title: `Action: ${base.title}`,
      detail: row.action_items.trim(),
    });
  }

  if (deadline && !row.action_items?.trim()) {
    items.push({
      ...base,
      id: `${row.id}:deadline`,
      kind: "deadline",
      occurredAt: deadline,
      title: `Deadline: ${base.title}`,
      detail: row.decisions_required?.trim() || base.detail,
    });
  }

  return items;
}

function validDate(value: string | null) {
  if (!value) return null;
  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? null : new Date(timestamp).toISOString();
}

function isCalendarRow(row: TimelineBriefRow) {
  return (
    row.source_type === "calendar" ||
    Boolean(row.source_message_id?.startsWith("calendar:"))
  );
}

function sourceLabel(provider: string | null, calendar: boolean) {
  const value = provider?.toLowerCase() ?? "";
  if (value.includes("google")) return calendar ? "Google Calendar" : "Gmail";
  if (value.includes("microsoft") || value.includes("outlook")) {
    return calendar ? "Outlook Calendar" : "Outlook";
  }
  return calendar ? "Calendar" : "Email";
}
