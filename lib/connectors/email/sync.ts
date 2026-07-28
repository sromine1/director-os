import type { SupabaseClient } from "@supabase/supabase-js";
import type { NylasMessage, NylasParticipant } from "./nylas/messages";

type ExistingBrief = {
  id: string;
  source_message_id: string | null;
};

export async function syncNylasMessagesToSupabase(
  supabase: SupabaseClient,
  messages: NylasMessage[],
) {
  if (messages.length === 0) {
    return { inserted: 0, updated: 0 };
  }

  const sourceMessageIds = messages.map((message) => message.id);
  const { data: existingRows, error: existingError } = await supabase
    .from("executive_briefs")
    .select("id, source_message_id")
    .in("source_message_id", sourceMessageIds);

  if (existingError) {
    throw new Error(`Unable to check saved messages: ${existingError.message}`);
  }

  const existingBySourceId = new Map(
    ((existingRows ?? []) as ExistingBrief[])
      .filter((row) => row.source_message_id)
      .map((row) => [row.source_message_id as string, row.id]),
  );

  const inserts = [];
  const updates = [];

  for (const message of messages) {
    const record = mapMessageToBrief(message);
    const existingId = existingBySourceId.get(message.id);

    if (existingId) {
      updates.push(
        supabase
          .from("executive_briefs")
          .update(record)
          .eq("id", existingId),
      );
    } else {
      inserts.push(record);
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

  return { inserted: inserts.length, updated: updates.length };
}

function mapMessageToBrief(message: NylasMessage) {
  return {
    source_message_id: message.id,
    subject: message.subject?.trim() || "No subject",
    sender: formatParticipant(message.from?.[0], "Unknown sender"),
    recipients: (message.to ?? [])
      .map((participant) => formatParticipant(participant, ""))
      .filter(Boolean)
      .join(", ") || null,
    received_at: message.date
      ? new Date(message.date * 1000).toISOString()
      : null,
    category: message.unread ? "Unread email" : "Email",
    priority: message.starred ? "High" : "Low",
    executive_summary:
      message.snippet?.trim() || "Open this message to view its contents.",
    body_text: message.snippet?.trim() || null,
    has_attachments: false,
  };
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
