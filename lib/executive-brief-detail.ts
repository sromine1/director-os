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
> & {
  score: number;
  reasons: string[];
};

export function findRelatedBriefs(
  current: BriefDetail,
  candidates: BriefDetail[],
  limit = 6,
): RelatedBrief[] {
  return candidates
    .filter((candidate) => candidate.id !== current.id)
    .map((candidate) => scoreRelatedBrief(current, candidate))
    .filter((candidate): candidate is RelatedBrief => candidate !== null)
    .sort(
      (a, b) =>
        b.score - a.score || dateValue(b.received_at) - dateValue(a.received_at),
    )
    .slice(0, limit);
}

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

function scoreRelatedBrief(
  current: BriefDetail,
  candidate: BriefDetail,
): RelatedBrief | null {
  let score = 0;
  const reasons: string[] = [];
  const currentAi = getBriefAiMetadata(current.raw_ai_output);
  const candidateAi = getBriefAiMetadata(candidate.raw_ai_output);

  if (sameValue(current.client, candidate.client)) {
    score += 40;
    reasons.push(`Same client: ${current.client?.trim()}`);
  }

  const sharedProjects = intersect(currentAi.projects, candidateAi.projects);
  if (sharedProjects.length > 0) {
    score += 35 + Math.min(sharedProjects.length - 1, 2) * 5;
    reasons.push(`Project: ${sharedProjects.slice(0, 2).join(", ")}`);
  }

  const sharedOrganizations = intersect(
    currentAi.organizations,
    candidateAi.organizations,
  );
  if (sharedOrganizations.length > 0) {
    score += 25;
    reasons.push(`Organization: ${sharedOrganizations.slice(0, 2).join(", ")}`);
  }

  const sharedPeople = intersect(
    [current.sender ?? "", ...splitPeople(current.recipients), ...currentAi.people],
    [candidate.sender ?? "", ...splitPeople(candidate.recipients), ...candidateAi.people],
  );
  if (sharedPeople.length > 0) {
    score += 25 + Math.min(sharedPeople.length - 1, 2) * 5;
    reasons.push(`People: ${sharedPeople.slice(0, 2).join(", ")}`);
  }

  const sharedTerms = intersect(
    subjectTerms(current.subject),
    subjectTerms(candidate.subject),
  );
  if (sharedTerms.length > 0) {
    score += Math.min(sharedTerms.length, 3) * 8;
    reasons.push(`Topic: ${sharedTerms.slice(0, 3).join(", ")}`);
  }

  if (
    sameValue(current.source_account, candidate.source_account) &&
    score > 0
  ) {
    score += 5;
  }

  const daysApart = dayDistance(current.received_at, candidate.received_at);
  if (daysApart !== null && daysApart <= 7 && score > 0) {
    score += Math.max(2, 10 - daysApart);
    reasons.push(daysApart === 0 ? "Same day" : `${daysApart} days apart`);
  }

  if (score < 16 || reasons.length === 0) return null;
  return {
    id: candidate.id,
    subject: candidate.subject,
    priority: candidate.priority,
    received_at: candidate.received_at,
    source_type: candidate.source_type,
    score,
    reasons: reasons.slice(0, 3),
  } satisfies RelatedBrief;
}

function sameValue(a: string | null | undefined, b: string | null | undefined) {
  const first = normalize(a);
  return Boolean(first && first === normalize(b));
}

function intersect(first: string[], second: string[]) {
  const secondValues = new Set(second.map(normalize).filter(Boolean));
  const matches = new Map<string, string>();
  for (const value of first) {
    const key = normalize(value);
    if (key && secondValues.has(key) && !matches.has(key)) {
      matches.set(key, value.trim());
    }
  }
  return [...matches.values()];
}

function normalize(value: string | null | undefined) {
  return value?.trim().toLowerCase() ?? "";
}

function splitPeople(value: string | null) {
  return value?.split(/[,;\n]/).map((item) => item.trim()).filter(Boolean) ?? [];
}

const SUBJECT_STOP_WORDS = new Set([
  "about", "from", "have", "meeting", "please", "that", "this", "with",
  "your", "re", "fw", "fwd", "the", "and", "for", "you",
]);

function subjectTerms(value: string | null) {
  return (value?.toLowerCase().match(/[a-z0-9]{3,}/g) ?? []).filter(
    (term) => !SUBJECT_STOP_WORDS.has(term),
  );
}

function dayDistance(a: string | null, b: string | null) {
  const first = dateValue(a);
  const second = dateValue(b);
  if (!first || !second) return null;
  return Math.floor(Math.abs(first - second) / 86_400_000);
}

function dateValue(value: string | null) {
  if (!value) return 0;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}
