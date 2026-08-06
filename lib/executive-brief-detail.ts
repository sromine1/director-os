export type BriefDetail = {
  id: string;
  subject: string | null;
  sender: string | null;
  recipients: string | null;
  body_text: string | null;
  priority: string | null;
  category: string | null;
  deadline: string | null;
  executive_summary: string | null;
  action_items: string | null;
  decisions_required: string | null;
  risks: string | null;
  suggested_reply: string | null;
  received_at: string | null;
  created_at: string;
  client: string | null;
  source_provider?: string | null;
  source_account?: string | null;
  source_type?: string | null;
  web_link?: string | null;
  raw_ai_output: unknown | null;
};

export type BriefAiMetadata = {
  confidence: number | null;
  importanceScore: number | null;
  urgencyReason: string | null;
  suppressionReason: string | null;
  people: string[];
  organizations: string[];
  projects: string[];
  processedAt: string | null;
  model: string | null;
};

export type RelatedBrief = Pick<
  BriefDetail,
  "id" | "subject" | "priority" | "received_at" | "source_type"
>;

export function getBriefAiMetadata(value: unknown): BriefAiMetadata {
  const record = asRecord(value);

  return {
    confidence: asFiniteNumber(record.confidence),
    importanceScore: asFiniteNumber(record.importance_score),
    urgencyReason: asNonEmptyString(record.urgency_reason),
    suppressionReason: asNonEmptyString(record.suppression_reason),
    people: asStringArray(record.people),
    organizations: asStringArray(record.organizations),
    projects: asStringArray(record.projects),
    processedAt: asNonEmptyString(record.processed_at),
    model: asNonEmptyString(record.model),
  };
}

export function isMeetingBrief(brief: BriefDetail) {
  return brief.source_type === "calendar";
}

export function sourceName(brief: BriefDetail) {
  const provider = brief.source_provider?.toLowerCase();
  const meeting = isMeetingBrief(brief);

  if (provider?.includes("google")) {
    return meeting ? "Google Calendar" : "Gmail";
  }
  if (provider?.includes("microsoft") || provider?.includes("outlook")) {
    return meeting ? "Outlook Calendar" : "Outlook";
  }
  return meeting ? "Calendar" : "Email";
}

export function formatBriefDate(value: string | null) {
  if (!value) return "Not available";
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) return value;

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/New_York",
  }).format(date);
}

function asRecord(value: unknown): Record<string, unknown> {
  if (typeof value === "string") {
    try {
      return asRecord(JSON.parse(value) as unknown);
    } catch {
      return {};
    }
  }
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function asFiniteNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function asNonEmptyString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function asStringArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter(
        (item): item is string => typeof item === "string" && Boolean(item.trim()),
      )
    : [];
}
