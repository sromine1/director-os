import type { SupabaseClient } from "@supabase/supabase-js";
import { analyzeMessageForExecutiveBrief } from "@/lib/ai/executive-brief";
import type { NylasMessage, NylasParticipant } from "./nylas/messages";

type ExistingBrief = {
  id: string;
  source_message_id: string | null;
  source_grant_id: string | null;
  raw_ai_output: unknown | null;
};

type SourceContext = {
  provider?: string;
  account?: string;
  grantId?: string;
  reanalyze?: boolean;
};

const MAX_AI_ANALYSES_PER_SYNC = 5;

export async function syncNylasMessagesToSupabase(
  supabase: SupabaseClient,
  messages: NylasMessage[],
  source: SourceContext = {},
) {
  await removeLegacySeededBriefs(supabase);

  if (messages.length === 0) {
    return { inserted: 0, updated: 0, analyzed: 0, analysisFailed: 0 };
  }

  const sourceMessageIds = messages.map((message) => message.id);
  const { data: existingRows, error: existingError } = await supabase
    .from("executive_briefs")
    .select("id, source_message_id, source_grant_id, raw_ai_output")
    .in("source_message_id", sourceMessageIds);

  if (existingError) {
    throw new Error(`Unable to check saved messages: ${existingError.message}`);
  }

  const rows = (existingRows ?? []) as ExistingBrief[];
  const existingBySourceId = new Map<string, ExistingBrief>();

  for (const row of rows) {
    if (!row.source_message_id) continue;
    const exactKey = briefKey(row.source_message_id, row.source_grant_id ?? undefined);
    existingBySourceId.set(exactKey, row);

    // Older records did not have a grant ID. Keep this fallback so a sync can
    // upgrade those rows instead of inserting duplicates.
    if (!row.source_grant_id) {
      existingBySourceId.set(row.source_message_id, row);
    }
  }

  const inserts = [];
  const updates = [];
  const analysisCandidates: NylasMessage[] = [];

  for (const message of messages) {
    const existing =
      existingBySourceId.get(briefKey(message.id, source.grantId)) ??
      existingBySourceId.get(message.id);
    const record = mapMessageToBrief(message, source, existing?.raw_ai_output);

    if (existing) {
      updates.push(
        supabase
          .from("executive_briefs")
          .update(record)
          .eq("id", existing.id),
      );
      if (source.reanalyze || !hasExecutiveAnalysis(existing.raw_ai_output)) {
        analysisCandidates.push(message);
      }
    } else {
      inserts.push(record);
      analysisCandidates.push(message);
    }
  }

  if (inserts.length > 0) {
    const { error: insertError } = await supabase
      .from("executive_briefs")
      .insert(inserts);

    if (insertError) {
      throw new Error(`Unable to save new messages: ${insertError.message}`);
    }
  }

  if (updates.length > 0) {
    const updateResults = await Promise.all(updates);
    const failedUpdate = updateResults.find((result) => result.error);

    if (failedUpdate?.error) {
      throw new Error(`Unable to update saved messages: ${failedUpdate.error.message}`);
    }
  }

  let analyzed = 0;
  let analysisFailed = 0;

  for (const message of analysisCandidates.slice(0, MAX_AI_ANALYSES_PER_SYNC)) {
    try {
      const analysis = await analyzeMessageForExecutiveBrief(message);
      let query = supabase
        .from("executive_briefs")
        .update(mapAnalysisToBrief(analysis, message, source))
        .eq("source_message_id", message.id);

      if (source.grantId) {
        query = query.eq("source_grant_id", source.grantId);
      }

      const { error: analysisError } = await query;

      if (analysisError) {
        throw new Error(analysisError.message);
      }
      analyzed += 1;
    } catch (error) {
      analysisFailed += 1;
      console.error(`Unable to analyze message ${message.id}:`, error);
    }
  }

  return {
    inserted: inserts.length,
    updated: updates.length,
    analyzed,
    analysisFailed,
  };
}

async function removeLegacySeededBriefs(supabase: SupabaseClient) {
  const { error } = await supabase
    .from("executive_briefs")
    .delete()
    .is("source_message_id", null)
    .in("subject", ["PowerCo Architecture Approval", "PowerCo Test"]);

  if (error) {
    throw new Error(`Unable to remove legacy test messages: ${error.message}`);
  }
}

function mapMessageToBrief(
  message: NylasMessage,
  source: SourceContext,
  currentRawAiOutput?: unknown,
) {
  const provider = normalizeProvider(source.provider);
  const sourceType = message.id.startsWith("calendar:") ? "calendar" : "email";

  return {
    source_message_id: message.id,
    source_provider: provider,
    source_account: source.account || null,
    source_type: sourceType,
    source_grant_id: source.grantId || null,
    subject: message.subject?.trim() || "No subject",
    sender: formatParticipant(message.from?.[0], "Unknown sender"),
    recipients:
      (message.to ?? [])
        .map((participant) => formatParticipant(participant, ""))
        .filter(Boolean)
        .join(", ") || null,
    received_at: message.date
      ? new Date(message.date * 1000).toISOString()
      : null,
    body_text: message.snippet?.trim() || null,
    has_attachments: false,
    provider_message_id: message.id,
    provider_thread_id: message.thread_id ?? null,
    web_link: message.webLink ?? buildMessageUrl(source.provider, message),
    raw_ai_output: {
      ...asRecord(currentRawAiOutput),
      source_provider: provider,
      source_account: source.account || null,
      source_type: sourceType,
      source_grant_id: source.grantId || null,
    },
  };
}

function mapAnalysisToBrief(
  analysis: Awaited<ReturnType<typeof analyzeMessageForExecutiveBrief>>,
  message: NylasMessage,
  source: SourceContext,
) {
  const deadline = analysis.deadlines[0] || null;
  const provider = normalizeProvider(source.provider);
  const sourceType = message.id.startsWith("calendar:") ? "calendar" : "email";

  return {
    source_provider: provider,
    source_account: source.account || null,
    source_type: sourceType,
    source_grant_id: source.grantId || null,
    priority: analysis.priority,
    category: analysis.category,
    executive_summary: analysis.executive_summary,
    action_items: joinItems(analysis.action_items),
    decisions_required: joinItems(analysis.decisions_required),
    deadline,
    risks: joinItems(analysis.risks),
    suggested_reply: analysis.suggested_reply || null,
    estimated_effort: importanceToEffort(analysis.importance_score),
    client: analysis.organizations[0] || null,
    provider_message_id: message.id,
    provider_thread_id: message.thread_id ?? null,
    web_link: message.webLink ?? buildMessageUrl(source.provider, message),
    raw_ai_output: {
      ...analysis,
      source_provider: provider,
      source_account: source.account || null,
      source_type: sourceType,
      source_grant_id: source.grantId || null,
      processed_at: new Date().toISOString(),
      model: process.env.OPENAI_MODEL?.trim() || "gpt-5-mini",
    },
  };
}

function briefKey(sourceMessageId: string, grantId?: string) {
  return grantId ? `${grantId}:${sourceMessageId}` : sourceMessageId;
}

function asRecord(value: unknown): Record<string, unknown> {
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value) as unknown;
      return parsed && typeof parsed === "object" && !Array.isArray(parsed)
        ? (parsed as Record<string, unknown>)
        : {};
    } catch {
      return {};
    }
  }

  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function hasExecutiveAnalysis(value: unknown) {
  const record = asRecord(value);
  return typeof record.importance_score === "number";
}

function normalizeProvider(provider?: string) {
  const normalized = provider?.toLowerCase() ?? "unknown";
  if (normalized.includes("google")) return "google";
  if (normalized.includes("microsoft") || normalized.includes("outlook")) {
    return "microsoft";
  }
  return normalized;
}

function joinItems(items: string[]) {
  return items.length > 0 ? items.join("\n") : null;
}

function importanceToEffort(score: number) {
  if (score >= 85) return "Immediate attention";
  if (score >= 65) return "Review today";
  if (score >= 40) return "Review this week";
  return "No immediate action";
}

function formatParticipant(
  participant: NylasParticipant | undefined,
  fallback: string,
) {
  if (!participant) return fallback;
  if (participant.name && participant.email) {
    return `${participant.name} <${participant.email}>`;
  }

  return participant.name || participant.email || fallback;
}

function buildMessageUrl(
  provider: string | undefined,
  message: { id: string },
): string | null {
  if (message.id.startsWith("calendar:")) {
    switch (normalizeProvider(provider)) {
      case "google":
        return "https://calendar.google.com/calendar/u/0/r";
      case "microsoft":
        return "https://outlook.office.com/calendar/view/month";
      default:
        return null;
    }
  }

  switch (normalizeProvider(provider)) {
    case "google":
      return `https://mail.google.com/mail/u/0/#all/${message.id}`;

    case "microsoft":
      return `https://outlook.office.com/mail/deeplink/read/${encodeURIComponent(message.id)}`;

    default:
      return null;
  }
}
