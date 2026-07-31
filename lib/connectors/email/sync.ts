import type { SupabaseClient } from "@supabase/supabase-js";
import { analyzeMessageForExecutiveBrief } from "@/lib/ai/executive-brief";
import type { NylasMessage, NylasParticipant } from "./nylas/messages";

type ExistingBrief = {
  id: string;
  source_message_id: string | null;
  raw_ai_output: unknown | null;
};

type SourceContext = {
  provider?: string;
  account?: string;
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
    .select("id, source_message_id, raw_ai_output")
    .in("source_message_id", sourceMessageIds);

  if (existingError) {
    throw new Error(`Unable to check saved messages: ${existingError.message}`);
  }

  const existingBySourceId = new Map(
    ((existingRows ?? []) as ExistingBrief[])
      .filter((row) => row.source_message_id)
      .map((row) => [row.source_message_id as string, row]),
  );

  const inserts = [];
  const updates = [];
  const analysisCandidates: NylasMessage[] = [];

  for (const message of messages) {
    const record = mapMessageToBrief(message);
    const existing = existingBySourceId.get(message.id);

    if (existing) {
      updates.push(
        supabase
          .from("executive_briefs")
          .update(record)
          .eq("id", existing.id),
      );
      if (!existing.raw_ai_output) analysisCandidates.push(message);
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
      const { error: analysisError } = await supabase
        .from("executive_briefs")
        .update(mapAnalysisToBrief(analysis, message, source))
        .eq("source_message_id", message.id);

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
    .eq("subject", "PowerCo Architecture Approval")
    .ilike("sender", "%boris@diconium.com%")
    .eq("deadline", "2026-07-10T15:00:00Z");

  if (error) {
    throw new Error(`Unable to remove legacy test messages: ${error.message}`);
  }
}

function mapMessageToBrief(message: NylasMessage) {
  return {
    source_message_id: message.id,
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
  };
}

function mapAnalysisToBrief(
  analysis: Awaited<ReturnType<typeof analyzeMessageForExecutiveBrief>>,
  message: NylasMessage,
  source: SourceContext,
) {
  const deadline = analysis.deadlines[0] || null;
  return {
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
    raw_ai_output: {
      ...analysis,
      source_provider: normalizeProvider(source.provider),
      source_account: source.account || null,
      source_type: message.id.startsWith("calendar:") ? "calendar" : "email",
      processed_at: new Date().toISOString(),
      model: process.env.OPENAI_MODEL?.trim() || "gpt-5-mini",
    },
  };
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
