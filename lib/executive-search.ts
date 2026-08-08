export type SearchBriefRow = {
  id: string;
  subject: string | null;
  sender: string | null;
  recipients: string | null;
  client: string | null;
  category: string | null;
  priority: string | null;
  executive_summary: string | null;
  body_text: string | null;
  action_items: string | null;
  decisions_required: string | null;
  risks: string | null;
  received_at: string | null;
  completed_at: string | null;
  source_type: string | null;
  source_provider: string | null;
  raw_ai_output: unknown | null;
};

export type ExecutiveSearchResult = {
  brief: SearchBriefRow;
  score: number;
  matches: string[];
  snippet: string;
};

type SearchIntent = {
  terms: string[];
  meeting: boolean;
  risk: boolean;
  decision: boolean;
  action: boolean;
  completed: boolean;
  open: boolean;
  priority: string | null;
  dateRange: { start: number; end: number } | null;
};

export function searchExecutiveBriefs(
  rows: SearchBriefRow[],
  query: string,
  now = new Date(),
) {
  const intent = parseSearchIntent(query, now);
  if (!query.trim()) return [];

  return rows
    .map((row) => scoreRow(row, intent))
    .filter((result): result is ExecutiveSearchResult => result !== null)
    .sort(
      (a, b) =>
        b.score - a.score || dateValue(b.brief.received_at) - dateValue(a.brief.received_at),
    )
    .slice(0, 50);
}

function scoreRow(
  row: SearchBriefRow,
  intent: SearchIntent,
): ExecutiveSearchResult | null {
  if (intent.meeting && row.source_type !== "calendar") return null;
  if (intent.risk && !row.risks?.trim()) return null;
  if (intent.decision && !row.decisions_required?.trim()) return null;
  if (intent.action && !row.action_items?.trim()) return null;
  if (intent.completed && !row.completed_at) return null;
  if (intent.open && row.completed_at) return null;
  if (intent.priority && normalize(row.priority) !== intent.priority) return null;

  const receivedAt = dateValue(row.received_at);
  if (
    intent.dateRange &&
    (receivedAt < intent.dateRange.start || receivedAt >= intent.dateRange.end)
  ) {
    return null;
  }

  const fields = [
    ["Subject", row.subject, 12],
    ["Sender", row.sender, 11],
    ["Recipients", row.recipients, 8],
    ["Client", row.client, 10],
    ["Summary", row.executive_summary, 7],
    ["Action item", row.action_items, 7],
    ["Decision", row.decisions_required, 7],
    ["Risk", row.risks, 7],
    ["Email body", row.body_text, 3],
    ["AI context", stringifyAi(row.raw_ai_output), 4],
  ] as const;

  let score = 0;
  const matches = new Set<string>();
  for (const term of intent.terms) {
    let termMatched = false;
    for (const [label, value, weight] of fields) {
      if (normalize(value).includes(term)) {
        score += weight;
        matches.add(label);
        termMatched = true;
      }
    }
    if (!termMatched) return null;
  }

  if (intent.meeting) matches.add("Meeting");
  if (intent.risk) matches.add("Open risk");
  if (intent.decision) matches.add("Decision required");
  if (intent.action) matches.add("Action item");
  if (intent.completed) matches.add("Completed");
  if (intent.open) matches.add("Open");
  if (intent.priority) matches.add(`${capitalize(intent.priority)} priority`);
  if (intent.dateRange) matches.add("Date range");

  const hasStructuredIntent = matches.size > 0;
  if (score === 0 && !hasStructuredIntent) return null;

  return {
    brief: row,
    score: score + matches.size,
    matches: [...matches].slice(0, 4),
    snippet: resultSnippet(row, intent),
  };
}

function parseSearchIntent(query: string, now: Date): SearchIntent {
  const normalized = normalize(query);
  const meeting = /\b(meeting|meetings|calendar|appointment)\b/.test(normalized);
  const risk = /\b(risk|risks|blocker|blockers)\b/.test(normalized);
  const decision = /\b(decision|decisions|approve|approval)\b/.test(normalized);
  const action = /\b(action|actions|task|tasks|todo|to-do)\b/.test(normalized);
  const completed = /\b(completed|complete|done|closed)\b/.test(normalized);
  const open = /\b(open|waiting|pending|outstanding|unresolved)\b/.test(normalized);
  const priority = ["critical", "high", "medium", "low"].find((value) =>
    new RegExp(`\\b${value}(?: priority)?\\b`).test(normalized),
  ) ?? null;
  const dateRange = parseDateRange(normalized, now);

  const terms = (normalized.match(/[a-z0-9@._-]{3,}/g) ?? []).filter(
    (term) => !SEARCH_STOP_WORDS.has(term) && !isIntentTerm(term),
  );

  return {
    terms: [...new Set(terms)],
    meeting,
    risk,
    decision,
    action,
    completed,
    open,
    priority,
    dateRange,
  };
}

function parseDateRange(query: string, now: Date) {
  if (/\btoday\b/.test(query)) return dayRange(now);
  if (/\byesterday\b/.test(query)) {
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    return dayRange(yesterday);
  }
  if (/\bthis week\b/.test(query)) return weekRange(now, 0);
  if (/\blast week\b/.test(query)) return weekRange(now, -1);
  if (/\bthis month\b/.test(query)) return monthRange(now, 0);
  if (/\blast month\b/.test(query)) return monthRange(now, -1);
  return null;
}

function dayRange(value: Date) {
  const start = new Date(value.getFullYear(), value.getMonth(), value.getDate());
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start: start.valueOf(), end: end.valueOf() };
}

function weekRange(value: Date, offset: number) {
  const start = new Date(value.getFullYear(), value.getMonth(), value.getDate());
  const day = start.getDay();
  start.setDate(start.getDate() - day + offset * 7);
  const end = new Date(start);
  end.setDate(end.getDate() + 7);
  return { start: start.valueOf(), end: end.valueOf() };
}

function monthRange(value: Date, offset: number) {
  const start = new Date(value.getFullYear(), value.getMonth() + offset, 1);
  const end = new Date(value.getFullYear(), value.getMonth() + offset + 1, 1);
  return { start: start.valueOf(), end: end.valueOf() };
}

function resultSnippet(row: SearchBriefRow, intent: SearchIntent) {
  if (intent.risk && row.risks?.trim()) return row.risks.trim();
  if (intent.decision && row.decisions_required?.trim()) return row.decisions_required.trim();
  if (intent.action && row.action_items?.trim()) return row.action_items.trim();
  return row.executive_summary?.trim() || row.body_text?.trim() || "No preview available.";
}

function stringifyAi(value: unknown) {
  if (typeof value === "string") return value;
  if (!value) return "";
  try {
    return JSON.stringify(value);
  } catch {
    return "";
  }
}

function isIntentTerm(term: string) {
  return INTENT_TERMS.has(term) || ["critical", "high", "medium", "low"].includes(term);
}

const SEARCH_STOP_WORDS = new Set([
  "all", "about", "any", "are", "everything", "find", "for", "from", "has",
  "have", "mention", "mentions", "month", "sent", "show", "that", "the", "this",
  "what", "when", "which", "with", "you", "your",
]);

const INTENT_TERMS = new Set([
  "action", "actions", "appointment", "appointments", "approval", "approve", "blocker",
  "blockers", "calendar", "closed", "complete", "completed", "decision", "decisions",
  "done", "last", "meeting", "meetings", "open", "outstanding", "pending", "risk",
  "risks", "task", "tasks", "today", "todo", "unresolved", "waiting", "week", "yesterday",
]);

function normalize(value: string | null | undefined) {
  return value?.toLowerCase().trim() ?? "";
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function dateValue(value: string | null) {
  if (!value) return 0;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}
